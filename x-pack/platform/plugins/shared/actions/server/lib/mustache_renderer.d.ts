import type { Logger } from '@kbn/core/server';
export type Escape = 'markdown' | 'slack' | 'json' | 'none' | 'html';
type Variables = Record<string, unknown>;
export declare function renderMustacheStringNoEscape(string: string, variables: Variables): string;
export declare function renderMustacheString(logger: Logger, string: string, variables: Variables, escape: Escape): string;
export declare function renderMustacheString(logger: Logger, string: string | null, variables: Variables, escape: Escape): string | null;
export declare function renderMustacheString(logger: Logger, string: string | undefined, variables: Variables, escape: Escape): string | undefined;
export declare function renderMustacheObject<Params>(logger: Logger, params: Params, variables: Variables): Params;
export {};
