import type { KibanaRequest } from '@kbn/core/server';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
interface BuildTaskFakeRequestOpts {
    apiKey?: string;
    spaceId?: string;
    userProfileId?: string;
    userName?: string;
    enrichFakeRequest?: FakeRequestEnricher;
}
/**
 * Builds the fake `KibanaRequest` used to execute a task. When the task has a
 * stored `userProfileId` and/or `userName`, the request is also enriched so
 * security APIs can resolve the originating user via `getCurrentUser`. Returns
 * `undefined` when there is no API key (i.e. the task was scheduled without a
 * user scope).
 */
export declare const buildTaskFakeRequest: ({ apiKey, spaceId, userProfileId, userName, enrichFakeRequest, }: BuildTaskFakeRequestOpts) => KibanaRequest | undefined;
/**
 * Returns a callback that mirrors the primary-request enrichment onto a child
 * fake request created by the running task. `undefined` when there is no
 * identity to propagate or no enrichment hook is wired.
 */
export declare const buildChildRequestEnricher: ({ userProfileId, userName, enrichFakeRequest, }: {
    userProfileId?: string;
    userName?: string;
    enrichFakeRequest?: FakeRequestEnricher;
}) => ((request: KibanaRequest) => void) | undefined;
export {};
