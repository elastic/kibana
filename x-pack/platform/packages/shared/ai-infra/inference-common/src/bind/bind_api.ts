/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FunctionCallingMode } from '../chat_complete';

export interface BoundOptions {
  functionCalling?: FunctionCallingMode;
  connectorId: string;
}

type BoundOptionKey = keyof BoundOptions;

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

export function bindApi<T extends BindableAPI, U extends BoundOptions>(
  api: T,
  boundParams: U
): BoundAPI<T>;

export function bindApi(api: BindableAPI, boundParams: BoundOptions) {
  const { functionCalling, connectorId } = boundParams;
  return (params: UnboundOptions<BoundOptions>) => {
    return api({
      ...params,
      functionCalling,
      connectorId,
    });
  };
}
