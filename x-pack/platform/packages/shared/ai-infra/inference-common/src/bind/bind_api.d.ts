import type { FunctionCallingMode } from '../chat_complete';
export interface BoundOptions {
    functionCalling?: FunctionCallingMode;
    connectorId: string;
}
type BoundOptionKey = keyof BoundOptions;
type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;
export type UnboundOptions<TOptions extends BoundOptions> = DistributiveOmit<TOptions, BoundOptionKey>;
type BindableAPI = (options: any, ...rest: any[]) => any;
type BoundAPI<F extends BindableAPI> = F extends (options: infer O, ...rest: infer R) => infer Ret ? O extends BoundOptions ? (options: UnboundOptions<O>, ...rest: R) => Ret : never : never;
export declare function bindApi<T extends BindableAPI, U extends BoundOptions>(api: T, boundParams: U): BoundAPI<T>;
export {};
