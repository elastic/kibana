import type { Logger } from '@kbn/core/server';
import type { ActionsConfig } from '../config';
export declare function getCanonicalCustomHostUrl(url: URL): string;
export declare function resolveCustomHosts(logger: Logger, config: ActionsConfig): ActionsConfig;
