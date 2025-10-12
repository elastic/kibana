/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Span } from '@opentelemetry/api';
import {
  InstrumentationBase,
  InstrumentationNodeModuleDefinition,
  type InstrumentationConfig,
  type InstrumentationModuleDefinition,
} from '@opentelemetry/instrumentation';
import type { Transport } from '@elastic/transport';
import type {
  TransportRequestMetadata,
  TransportRequestOptions,
  TransportRequestParams,
} from '@elastic/elasticsearch';
import { withActiveSpan } from '@kbn/tracing-utils';

const INSTRUMENTATION_NAME = 'kibana-elasticsearch-transport';
const INSTRUMENTATION_VERSION = '1.0.0';
const MAX_CAPTURE_BYTES = 8 * 1024; // 8KiB
const SAFE_CONTENT_TYPES = ['application/json', 'text/', 'application/x-ndjson'];

const DEFAULT_CONFIG: Required<ElasticsearchInstrumentationConfig> = {
  enabled: true,
  captureRequestBody: true,
  captureResponseBody: false,
};

interface ElasticsearchInstrumentationConfig extends InstrumentationConfig {
  captureRequestBody?: boolean;
  captureResponseBody?: boolean;
}

interface TransportConstructor {
  prototype?: {
    request?: Transport['_request'];
  };
}

type TransportRequestArgs =
  | [TransportRequestParams]
  | [TransportRequestParams, TransportRequestOptions]
  | [TransportRequestParams, TransportRequestOptions | undefined, TransportRequestMetadata];

export class ElasticsearchInstrumentation extends InstrumentationBase<ElasticsearchInstrumentationConfig> {
  private readonly patchedTransports = new WeakSet<object>();

  constructor(config: ElasticsearchInstrumentationConfig = {}) {
    super(INSTRUMENTATION_NAME, INSTRUMENTATION_VERSION, {
      ...DEFAULT_CONFIG,
      ...config,
    });
  }

  override setConfig(config: ElasticsearchInstrumentationConfig = {}) {
    super.setConfig({
      ...DEFAULT_CONFIG,
      ...config,
    });
  }

  protected init(): InstrumentationModuleDefinition[] {
    const definition = new InstrumentationNodeModuleDefinition(
      '@elastic/transport',
      ['*'],
      (moduleExports) => {
        const ctor = this.resolveTransportConstructor(moduleExports);
        if (ctor) {
          this.patchTransport(ctor);
        }
        return moduleExports;
      },
      (moduleExports) => {
        const ctor = this.resolveTransportConstructor(moduleExports);
        if (ctor) {
          this.unpatchTransport(ctor);
        }
      }
    );

    return [definition];
  }

  private resolveTransportConstructor(moduleExports: unknown): TransportConstructor | undefined {
    if (!moduleExports) {
      return undefined;
    }

    if (typeof moduleExports === 'function') {
      return moduleExports as TransportConstructor;
    }

    const mod = moduleExports as Record<string, unknown>;
    const ctor = (mod.Transport ?? mod.default ?? moduleExports) as TransportConstructor;
    if (ctor && typeof ctor === 'function') {
      return ctor;
    }

    return undefined;
  }

  private patchTransport(ctor: TransportConstructor) {
    const proto = ctor.prototype;
    if (!proto || this.patchedTransports.has(proto)) {
      return;
    }

    if (typeof proto.request !== 'function') {
      this._diag.debug('Transport.prototype.request is not a function; skipping patch');
      return;
    }

    this._wrap(proto as Record<string, unknown>, 'request', (original) => {
      if (typeof original !== 'function') {
        return original;
      }
      return this.createRequestWrapper(original as (...args: unknown[]) => unknown);
    });
    this.patchedTransports.add(proto);
  }

  private unpatchTransport(ctor: TransportConstructor) {
    const proto = ctor.prototype;
    if (!proto || !this.patchedTransports.has(proto)) {
      return;
    }

    this._unwrap(proto, 'request');
    this.patchedTransports.delete(proto);
  }

  private createRequestWrapper(original: (...args: TransportRequestArgs) => unknown) {
    const instrumentation = this;
    return function patchedRequest(this: unknown, ...args: TransportRequestArgs) {
      instrumentation._diag.debug(`Transport.request`);

      const config = instrumentation.getConfig();

      const request = args[0];

      const options = args.length > 1 ? args[1] : undefined;
      const meta = args.length > 2 ? args[2] : undefined;

      if (!config.captureRequestBody && !config.captureResponseBody) {
        instrumentation._diag.debug(
          `Skipping capture as both request and response should not be captured`
        );
        return;
      }

      return withActiveSpan('Transport.request', (span) => {
        if (config.captureRequestBody) {
          instrumentation.captureRequestAttributes(request, options, meta, span);
        }

        const response = original.apply(this, args);

        return response;
      });
    };
  }

  private captureRequestAttributes(
    request: TransportRequestParams,
    options?: TransportRequestOptions,
    meta?: TransportRequestMetadata,
    span?: Span
  ) {
    if (!span) {
      this._diag.debug(`No active span found`);
      return;
    }

    if (!request || request.body == null) {
      this._diag.debug(`No request body found`);
      return;
    }

    if (request.path) {
      span.setAttribute('elasticsearch.path', request.path);
    }

    if (meta?.name) {
      span.updateName(meta.name);
    }

    const buffer = this.toBuffer(request.body);
    if (!buffer) {
      this._diag.debug(`No buffer found`);
      return;
    }

    span.setAttribute('http.request.body.size', buffer.length);

    const contentType = this.readContentType(options?.headers);
    if (!this.shouldCaptureContent(contentType)) {
      this._diag.debug(`Skipping capturing content`);
      return;
    }

    const { text, truncated } = this.toTruncatedString(buffer);
    if (!text) {
      this._diag.debug(`No text found`);
      return;
    }

    if (contentType?.includes('json') && !this.isValidJson(text)) {
      this._diag.debug(`Not a valid content type`, { text, contentType });
      return;
    }

    span.setAttribute('http.request.body.content', text);
    if (truncated) {
      span.setAttribute('kibana.http.request.body.truncated', true);
    }
  }

  private toBuffer(body: unknown): Buffer | undefined {
    try {
      if (body == null) {
        return undefined;
      }

      if (Buffer.isBuffer(body)) {
        return body;
      }

      if (typeof body === 'string') {
        return Buffer.from(body, 'utf8');
      }

      if (Array.isArray(body)) {
        const lines = body
          .map((line) => {
            if (typeof line === 'string') {
              return line;
            }
            return JSON.stringify(line);
          })
          .join('\n');
        return Buffer.from(lines, 'utf8');
      }

      if (typeof body === 'object') {
        return Buffer.from(JSON.stringify(body), 'utf8');
      }
    } catch (error) {
      this._diag.debug('Failed to serialise Elasticsearch request body', error as Error);
    }

    return undefined;
  }

  private readContentType(
    headers: TransportRequestOptions['headers'] | undefined
  ): string | undefined {
    if (!headers || typeof headers !== 'object') {
      return undefined;
    }

    const raw = headers['content-type'] ?? headers['Content-Type'];

    if (Array.isArray(raw)) {
      return raw.find((value): value is string => typeof value === 'string');
    }

    return typeof raw === 'string' ? raw : undefined;
  }

  private shouldCaptureContent(contentType?: string): boolean {
    if (!contentType) {
      return true;
    }

    const normalised = contentType.toLowerCase();
    return SAFE_CONTENT_TYPES.some((type) =>
      type.endsWith('/') ? normalised.startsWith(type) : normalised.includes(type)
    );
  }

  private toTruncatedString(buffer: Buffer): { text?: string; truncated: boolean } {
    let text = buffer.toString('utf8');
    let truncated = false;

    if (text.length > MAX_CAPTURE_BYTES) {
      text = text.slice(0, MAX_CAPTURE_BYTES);
      truncated = true;
    }

    return { text, truncated };
  }

  private isValidJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      this._diag.debug('Captured body is not valid JSON', error as Error);
      return false;
    }
  }
}
