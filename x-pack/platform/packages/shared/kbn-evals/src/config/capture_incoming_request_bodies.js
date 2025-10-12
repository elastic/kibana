/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { trace } = require('@opentelemetry/api');

// Instruments @hapi/hapi inbound requests to capture body size/content attributes
// Attributes follow OpenTelemetry HTTP semantic conventions where applicable:
// - http.request.body.size
// - http.request.body.content (Kibana internal usage; ensure PII policy compliance)
// Truncation marker: kibana.http.request.body.truncated
//

exports.captureIncomingRequestBodies = () => {
  let hapi;
  try {
    // Lazy require so environments without Hapi don't fail.
    hapi = require('@hapi/hapi'); // eslint-disable-line @typescript-eslint/no-var-requires
  } catch (e) {
    return; // Hapi not present; nothing to do.
  }

  const Server = hapi.Server;
  if (!Server || Server.__kibanaCaptureIncomingBodyPatched) {
    return;
  }

  // Mark to avoid double instrumentation.
  Server.__kibanaCaptureIncomingBodyPatched = true;

  const MAX_CAPTURE_BYTES = 8 * 1024; // 8KiB
  const SAFE_CONTENT_TYPES = ['application/json', 'text/', 'application/x-ndjson'];

  function isSafeContentType(type, contentType) {
    if (type.endsWith('/')) {
      return (contentType || '').startsWith(type);
    }
    return (contentType || '').includes(type);
  }

  // Patch the server.decorate or direct ext registration after instantiation.
  const originalInitialize = Server.prototype.initialize;
  Server.prototype.initialize = async function patchedInitialize(...args) {
    // Register extension before actual listener setup.
    // 'onPreHandler' runs after payload parsing and before handler execution.
    this.ext('onPreHandler', (request, h) => {
      try {
        const span = trace.getActiveSpan();
        // We only proceed if there's an active span.
        if (!span || typeof span.setAttribute !== 'function') {
          return h.continue;
        }

        const contentType = request.headers['content-type'];
        const payload = request.payload; // May be object, Buffer, string, undefined

        // Size: derive from raw representation if possible.
        let bodyBuffer;
        if (payload == null) {
          return h.continue;
        } else if (Buffer.isBuffer(payload)) {
          bodyBuffer = payload;
        } else if (typeof payload === 'string') {
          bodyBuffer = Buffer.from(payload, 'utf8');
        } else if (typeof payload === 'object') {
          // Attempt JSON serialize with guard; might be already an object due to Hapi parsing
          try {
            const json = JSON.stringify(payload);
            bodyBuffer = Buffer.from(json, 'utf8');
          } catch (e) {
            // Non-serializable object; skip
            return h.continue;
          }
        } else {
          return h.continue; // Unsupported type
        }

        span.setAttribute('http.request.body.size', bodyBuffer.length);

        const allowContentCapture = !contentType
          ? true
          : SAFE_CONTENT_TYPES.some((t) => isSafeContentType(t, contentType));

        if (allowContentCapture) {
          let bodyStr = bodyBuffer.toString('utf8');
          let truncated = false;
          if (bodyStr.length > MAX_CAPTURE_BYTES) {
            bodyStr = bodyStr.slice(0, MAX_CAPTURE_BYTES);
            truncated = true;
          }

          if (contentType && contentType.includes('json')) {
            try {
              JSON.parse(bodyStr);
            } catch (e) {
              // Invalid JSON; skip content to avoid logging something misleading
              bodyStr = undefined;
            }
          }

          if (bodyStr != null) {
            span.setAttribute('http.request.body.content', bodyStr);
            if (truncated) {
              span.setAttribute('kibana.http.request.body.truncated', true);
            }
          }
        }
      } catch (err) {
        // Swallow to avoid breaking request lifecycle.
      }
      return h.continue;
    });

    return originalInitialize.apply(this, args);
  };
};
