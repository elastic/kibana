import type { Logger } from '@kbn/core/server';
import type { TaskTypeDictionary } from './task_type_dictionary';
import type { TaskInstance } from './task';
interface TaskValidatorOpts {
    allowReadingInvalidState: boolean;
    definitions: TaskTypeDictionary;
    logger: Logger;
}
export declare class TaskValidator {
    private readonly logger;
    private readonly definitions;
    private readonly allowReadingInvalidState;
    private readonly cachedGetLatestStateSchema;
    private readonly cachedExtendSchema;
    constructor({ definitions, allowReadingInvalidState, logger }: TaskValidatorOpts);
    getValidatedTaskInstanceFromReading<T extends TaskInstance>(task: T, options?: {
        validate: boolean;
    }): T;
    getValidatedTaskInstanceForUpdating<T extends TaskInstance>(task: T, options?: {
        validate: boolean;
    }): T;
    validateTimeoutOverride<T extends TaskInstance>(task: T): T;
    validateInterval<T extends TaskInstance>(task: T): T;
    validateRrule<T extends TaskInstance>(task: T): T;
    private migrateTaskState;
    private getValidatedStateSchema;
}
export {};
