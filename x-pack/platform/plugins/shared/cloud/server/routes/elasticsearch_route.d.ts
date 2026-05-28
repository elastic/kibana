import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
export declare function setElasticsearchRoute({ elasticsearchUrl, logger, router, }: {
    elasticsearchUrl?: string;
    logger: Logger;
    router: IRouter;
}): void;
