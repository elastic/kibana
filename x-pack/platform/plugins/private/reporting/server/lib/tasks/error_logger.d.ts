import type { Logger } from '@kbn/core/server';
export declare const errorLogger: (logger: Logger, message: string, err?: Error, tags?: string[]) => void;
