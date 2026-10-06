import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { InvalidateAPIKeyResult, InvalidateAPIKeysParams, InvalidateUiamAPIKeyParams } from '@kbn/security-plugin-types-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
export declare const TASK_ID = "invalidate_api_keys";
export type ApiKeyInvalidationFn = (params: InvalidateAPIKeysParams) => Promise<InvalidateAPIKeyResult | null> | undefined;
export type UiamApiKeyInvalidationFn = (request: KibanaRequest, params: InvalidateUiamAPIKeyParams) => Promise<InvalidateAPIKeyResult | null>;
export declare function scheduleInvalidateApiKeyTask(logger: Logger, taskScheduling: TaskScheduling, interval: string): Promise<void>;
interface RegisterInvalidateApiKeyTaskOpts {
    configInterval: string;
    coreStartServices: () => Promise<[CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]>;
    getEncryptedSavedObjectsClient: () => EncryptedSavedObjectsClient | undefined;
    invalidateApiKeyFn?: ApiKeyInvalidationFn;
    invalidateUiamApiKeyFn?: () => UiamApiKeyInvalidationFn | undefined;
    logger: Logger;
    removalDelay: string;
    taskTypeDictionary: TaskTypeDictionary;
}
export declare function registerInvalidateApiKeyTask(opts: RegisterInvalidateApiKeyTaskOpts): void;
type InvalidateApiKeysTaskRunnerOpts = Pick<RegisterInvalidateApiKeyTaskOpts, 'logger' | 'configInterval' | 'coreStartServices' | 'getEncryptedSavedObjectsClient' | 'invalidateApiKeyFn' | 'invalidateUiamApiKeyFn' | 'removalDelay'>;
interface InvalidateApiKeysTaskState {
    missing_api_key_retries?: Record<string, number>;
}
export declare function taskRunner(opts: InvalidateApiKeysTaskRunnerOpts): ({ taskInstance }: {
    taskInstance: {
        state: InvalidateApiKeysTaskState;
    };
}) => {
    run(): Promise<{
        state: {
            missing_api_key_retries: {
                [x: string]: number;
            };
        };
        schedule: {
            interval: string;
        };
    }>;
};
export {};
