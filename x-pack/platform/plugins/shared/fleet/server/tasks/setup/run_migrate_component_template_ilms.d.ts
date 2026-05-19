import type { Logger } from '@kbn/core/server';
export declare function runMigrateComponentTemplateILMs(params: {
    abortController: AbortController;
    logger: Logger;
}): Promise<void>;
