import type { Logger } from '@kbn/core/server';
import type { TaskInstance } from '../task';
export declare function getFirstRunAt({ taskInstance, logger, }: {
    taskInstance: TaskInstance;
    logger: Logger;
}): string;
