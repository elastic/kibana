/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What one sandbox-api RPC reports about itself.
 *
 * Every {@link SandboxSession} method returns it next to the call's result, and
 * {@link SandboxRpcError} carries it when the call fails. Log it with {@link sandboxRpcLogMeta}
 * together with the context only the caller has (the tool call or workflow step that issued the
 * RPC), so that one RPC can be joined across Kibana, the Elastic Cloud proxy and sandbox-api.
 */
export interface SandboxRpcInfo {
  /**
   * The id the Elastic Cloud proxy assigned to the request, from the `x-cloud-request-id`
   * response header. Missing when no response arrived, for example on a connection error or a
   * deadline timeout. The proxy also logs it as `request_id` and forwards it to sandbox-api.
   */
  requestId?: string;
  /** The conversation the call was made for, `<space>__<session>`. */
  conversationId: string;
  /** The fully qualified gRPC method, for example `sandbox.SandboxService/RunCommand`. */
  method: string;
  /** The gRPC status name, for example `OK` or `UNAVAILABLE`. */
  statusCode: string;
  /** How long the call took, in nanoseconds, measured client-side. */
  durationNs: number;
}

/** The result of a sandbox RPC together with what the RPC reports about itself. */
export interface SandboxRpcResult<T> {
  value: T;
  rpc: SandboxRpcInfo;
}

/**
 * Thrown when a sandbox RPC fails. It keeps the gRPC `code` and `details` of the original error,
 * which is its `cause`, and adds what the RPC reports about itself.
 */
export class SandboxRpcError extends Error {
  public readonly code?: number;
  public readonly details?: string;

  constructor(
    public readonly rpc: SandboxRpcInfo,
    cause: Error & { code?: number; details?: string }
  ) {
    super(cause.message, { cause });
    this.name = 'SandboxRpcError';
    this.code = cause.code;
    this.details = cause.details;
  }
}

/**
 * The log fields for one sandbox RPC. Kibana, the proxy and sandbox-api log the same fields with
 * the same values, which is what joins their records. The `rpc.*` fields follow the OpenTelemetry
 * semantic conventions, where the status code is `rpc.status_code` since 1.45.0 (1.43.0, the version
 * of `@opentelemetry/semantic-conventions` Kibana pins, still calls it `rpc.response.status_code`);
 * `http.request.id` and `event.duration` are ECS fields.
 *
 * | Field                     | Value                                                | sandbox-api source                  |
 * | ------------------------- | ---------------------------------------------------- | ----------------------------------- |
 * | `http.request.id`         | proxy request id from the response (omitted if none) | `x-cloud-request-id` request header |
 * | `sandbox.conversation_id` | `<space>__<conversation>`                            | `x-conversation-id` request header  |
 * | `rpc.method`              | `sandbox.SandboxService/RunCommand`, ...             | fully-qualified gRPC method         |
 * | `rpc.status_code`         | gRPC status name, for example `OK`, `UNAVAILABLE`    | gRPC status name                    |
 * | `event.duration`          | nanoseconds, measured client-side                    | nanoseconds, server-side            |
 */
export const sandboxRpcLogMeta = (rpc: SandboxRpcInfo) => ({
  ...(rpc.requestId ? { http: { request: { id: rpc.requestId } } } : {}),
  sandbox: { conversation_id: rpc.conversationId },
  rpc: {
    method: rpc.method,
    status_code: rpc.statusCode,
  },
  event: { duration: rpc.durationNs },
});
