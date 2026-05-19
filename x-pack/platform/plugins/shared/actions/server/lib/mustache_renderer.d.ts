import type { Logger } from '@kbn/core/server';
export type Escape = 'markdown' | 'slack' | 'json' | 'none';
type Variables = Record<string, unknown>;
export declare function renderMustacheStringNoEscape(string: string, variables: Variables): string;
export declare function renderMustacheString(logger: Logger, string: string, variables: Variables, escape: Escape): string;
export declare function renderMustacheObject<Params>(logger: Logger, params: Params, variables: Variables): Params;
export {};
