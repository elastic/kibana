import type { RouteParamsRT, ServerRoute } from '@kbn/server-route-repository-utils';
declare const __response: unique symbol;
export interface WithResponse<T> {
    readonly [__response]: T;
}
export type ExtractResponse<T> = T extends WithResponse<infer R> ? R extends void ? void : R extends Record<string, any> ? R : Record<string, never> : Record<string, never>;
export declare function defineRoute<TResponse extends Record<string, any> | void | null>(): <const TEndpoint extends string, TParams extends RouteParamsRT | undefined = undefined>(config: {
    endpoint: TEndpoint;
    params?: TParams;
}) => typeof config & WithResponse<TResponse>;
export type BuildRepository<T extends Record<string, {
    endpoint: string;
    params?: any;
}>> = {
    [K in keyof T as T[K]['endpoint']]: ServerRoute<T[K]['endpoint'], T[K]['params'], any, ExtractResponse<T[K]>, any>;
};
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type BuildGroupedRepository<T extends Record<string, Record<string, {
    endpoint: string;
    params?: any;
}>>> = UnionToIntersection<{
    [K in keyof T]: BuildRepository<T[K]>;
}[keyof T]>;
export {};
