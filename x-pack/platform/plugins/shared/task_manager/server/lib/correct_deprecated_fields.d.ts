import type { Logger } from '@kbn/core/server';
import type { TaskInstance, TaskInstanceWithDeprecatedFields } from '../task';
export declare function ensureDeprecatedFieldsAreCorrected({ id, taskType, interval, schedule, ...taskInstance }: TaskInstanceWithDeprecatedFields, logger: Logger): TaskInstance;
