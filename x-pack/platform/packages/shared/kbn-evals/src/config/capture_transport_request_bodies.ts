/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace } from '@opentelemetry/api';

/* eslint-disable import/no-extraneous-dependencies */
// Instruments @elastic/transport outgoing requests to capture body size/content.
// Uses OpenTelemetry semantic conventions where applicable:
// - http.request.body.size
// - http.request.body.content (internal optional attribute)
// Truncation marker: kibana.http.request.body.truncated
// Idempotent: safe to call multiple times.
exports.captureTransportRequestBodies = () => {
  let TransportMod;
  try {
    // Root package.json already declares @elastic/transport; dynamic require keeps optionality.
    TransportMod = require('@elastic/transport');
  } catch (e) {
    return; // Not available.
  }

  const Transport = TransportMod.Transport || TransportMod.default || TransportMod;

  if (!Transport || Transport.__kibanaCaptureTransportBodyPatched) {
    return;
  }
  Transport.__kibanaCaptureTransportBodyPatched = true;

  const MAX_CAPTURE_BYTES = 8 * 1024; // 8KiB
  const SAFE_CONTENT_TYPES = ['application/json', 'text/', 'application/x-ndjson'];

  function isSafeContentType(type: string, contentType: string) {
    if (type.endsWith('/')) {
      return (contentType || '').startsWith(type);
    }
    return (contentType || '').includes(type);
  }

  const originalRequest = Transport.prototype.request;
  if (typeof originalRequest !== 'function') {
    return;
  }

  Transport.prototype.request = function patchedTransportRequest(params, options, callback) {
    // Params shape: { method, path, body, ... }
    try {
      const span = trace.getActiveSpan();

      if (span && typeof span.setAttribute === 'function') {
        const body = params?.body;
        let contentTypeHeader;
        if (params?.headers) {
          contentTypeHeader = params.headers['content-type'] || params.headers['Content-Type'];
          if (Array.isArray(contentTypeHeader)) contentTypeHeader = contentTypeHeader[0];
        }

        console.log(body);

        let buffer;
        if (body == null) {
          // nothing
        } else if (Buffer.isBuffer(body)) {
          buffer = body;
        } else if (typeof body === 'string') {
          buffer = Buffer.from(body, 'utf8');
        } else if (Array.isArray(body)) {
          // NDJSON bulk body sometimes provided as array of strings/objects
          try {
            const lines = body.map((line) =>
              typeof line === 'string' ? line : JSON.stringify(line)
            );
            buffer = Buffer.from(lines.join('\\n'), 'utf8');
          } catch (e) {
            // ignore
          }
        } else if (typeof body === 'object') {
          try {
            buffer = Buffer.from(JSON.stringify(body), 'utf8');
          } catch (e) {
            // ignore non-serializable
          }
        }

        if (buffer) {
          span.setAttribute('http.request.body.size', buffer.length);
          const allowContentCapture = !contentTypeHeader
            ? true
            : SAFE_CONTENT_TYPES.some((t) => isSafeContentType(t, contentTypeHeader));
          if (allowContentCapture) {
            let bodyStr: string | undefined = buffer.toString('utf8');
            let truncated = false;
            if (bodyStr.length > MAX_CAPTURE_BYTES) {
              bodyStr = bodyStr.slice(0, MAX_CAPTURE_BYTES);
              truncated = true;
            }
            if (contentTypeHeader && contentTypeHeader.includes('json')) {
              try {
                JSON.parse(bodyStr);
              } catch (e) {
                bodyStr = undefined;
              }
            }
            if (bodyStr != null) {
              span.setAttribute('http.request.body.content', bodyStr);
              if (truncated) span.setAttribute('kibana.http.request.body.truncated', true);
            }
          }
        }
      }
    } catch (e) {
      // swallow
    }
    return originalRequest.call(this, params, options, callback);
  };
};
