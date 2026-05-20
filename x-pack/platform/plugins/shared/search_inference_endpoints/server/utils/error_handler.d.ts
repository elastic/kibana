import type { RequestHandlerWrapper } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
export declare const errorHandler: (logger: Logger) => RequestHandlerWrapper;
