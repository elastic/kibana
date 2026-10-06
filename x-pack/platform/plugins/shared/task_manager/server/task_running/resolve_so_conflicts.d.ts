import type { Logger } from '@kbn/core/server';
import { type Options as PRetryOptions } from 'p-retry';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from '../task';
import type { Updatable } from './task_runner';
export declare function resolveTaskDocumentConflicts(opts: ResolveTaskDocumentConflictsOpts): Promise<void>;
interface ResolveTaskDocumentConflictsOpts {
    taskId: string;
    partialTask: PartialConcreteTaskInstance;
    originalTask: ConcreteTaskInstance;
    bufferedTaskStore: Updatable;
    logger: Logger;
    pRetryOptions?: PRetryOptions;
}
export {};
