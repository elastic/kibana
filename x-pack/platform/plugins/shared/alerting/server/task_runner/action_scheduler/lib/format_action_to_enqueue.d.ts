import type { RuleAction, RuleSystemAction } from '@kbn/alerting-types';
import type { TaskPriority } from '@kbn/task-manager-plugin/server';
interface FormatActionToEnqueueOpts {
    action: RuleAction | RuleSystemAction;
    apiKeyId?: string;
    /**
     * Resolved credential to enqueue for this connector action. Either the
     * base64-encoded ES API key (`id:secret`) or the raw `essu_…` UIAM secret;
     * see `getFakeKibanaRequest` in `rule_loader.ts` (`effectiveApiKey`).
     */
    apiKey: string | null;
    /**
     * Id of the UIAM API key in `apiKey`, persisted alongside it on the action task
     * params so the API key invalidation task's in-use guard can see the enqueued
     * connector task still needs the key. `apiKeyId` never holds a UIAM id.
     */
    uiamApiKeyId?: string;
    /**
     * True when `apiKey` is an external (user-created Cloud) UIAM credential. The
     * actions plugin persists it on the action task params and uses it to mark the
     * connector execution fake request so the Elasticsearch cluster client does not
     * attach the UIAM shared secret, which UIAM rejects for external keys.
     */
    uiamApiKeyExternal?: boolean | null;
    executionId: string;
    priority?: TaskPriority;
    ruleConsumer: string;
    ruleId: string;
    ruleTypeId: string;
    spaceId: string;
}
export declare const formatActionToEnqueue: (opts: FormatActionToEnqueueOpts) => {
    id: string;
    uuid: string | undefined;
    params: import("@kbn/core/server").SavedObjectAttributes;
    spaceId: string;
    apiKey: string | null;
    apiKeyId: string | undefined;
    uiamApiKeyId?: string | undefined;
    uiamApiKeyExternal?: boolean | undefined;
    consumer: string;
    source: import("@kbn/actions-plugin/server/lib/action_execution_source").SavedObjectExecutionSource;
    executionId: string;
    relatedSavedObjects: {
        id: string;
        type: string;
        namespace: string | undefined;
        typeId: string;
    }[];
    actionTypeId: string;
    priority: TaskPriority | undefined;
};
export {};
