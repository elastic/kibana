/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChatCompleteMetadata, FunctionCallingMode } from '../chat_complete';

export interface BoundOptions {
  functionCalling?: FunctionCallingMode;
  connectorId: string;
  metadata?: ChatCompleteMetadata;
}

// All bound keys except `metadata`, which stays available for per-call overrides on bound APIs.
type BoundOptionKey = Exclude<keyof BoundOptions, 'metadata'>;

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type UnboundOptions<TOptions extends BoundOptions> = DistributiveOmit<
  TOptions,
  BoundOptionKey
>;

type BindableAPI = (options: any, ...rest: any[]) => any;

type BoundAPI<F extends BindableAPI> = F extends (options: infer O, ...rest: infer R) => infer Ret
  ? O extends BoundOptions
    ? (options: UnboundOptions<O>, ...rest: R) => Ret
    : never
  : never;

// Bound metadata acts as the default; per-call metadata overrides it, with
// `connectorTelemetry` deep-merged so a per-call `pluginId` wins without dropping other bound telemetry fields
function mergeBoundMetadata(
  bound: ChatCompleteMetadata,
  perCall: ChatCompleteMetadata | undefined
): ChatCompleteMetadata {
  if (!perCall) {
    return bound;
  }
  const boundTelemetry = bound.connectorTelemetry;
  const perCallTelemetry = perCall.connectorTelemetry;
  return {
    ...bound,
    ...perCall,
    connectorTelemetry: {
      ...boundTelemetry,
      ...perCallTelemetry,
      // A per-call `undefined` must not wipe a bound billing id (mirrors the kbn-evals wrapper).
      pluginId: perCallTelemetry?.pluginId ?? boundTelemetry?.pluginId,
      aggregateBy: perCallTelemetry?.aggregateBy ?? boundTelemetry?.aggregateBy,
    },
  };
}

export function bindApi<T extends BindableAPI, U extends BoundOptions>(
  api: T,
  boundParams: U
): BoundAPI<T>;

export function bindApi(api: BindableAPI, boundParams: BoundOptions) {
  const { functionCalling, connectorId, metadata: boundMetadata } = boundParams;
  return (params: UnboundOptions<BoundOptions>) => {
    return api({
      ...params,
      functionCalling,
      connectorId,
      ...(boundMetadata ? { metadata: mergeBoundMetadata(boundMetadata, params.metadata) } : {}),
    });
  };
}
