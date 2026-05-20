import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IlmPolicyMigrationStatus } from '@kbn/reporting-common/types';
/**
 * Responsible for detecting and provisioning the reporting ILM policy in stateful deployments.
 *
 * Uses the provided {@link ElasticsearchClient} to scope request privileges.
 */
export declare class IlmPolicyManager {
    private readonly client;
    constructor(client: ElasticsearchClient);
    static create(opts: {
        client: ElasticsearchClient;
    }): IlmPolicyManager;
    /**
     * Check that the ILM policy exists
     */
    doesIlmPolicyExist(): Promise<boolean>;
    /**
     * This method is automatically called on the Stack Management > Reporting page, by the `` API for users with
     * privilege to manage ILM, to notify them when attention is needed to update the policy for any reason.
     */
    checkIlmMigrationStatus(): Promise<IlmPolicyMigrationStatus>;
    /**
     * Create the Reporting ILM policy
     */
    createIlmPolicy(): Promise<void>;
    /**
     * Update the Data Stream index template with a link to the Reporting ILM policy
     */
    linkIlmPolicy(): Promise<{
        putTemplateResponse: estypes.AcknowledgedResponseBase;
        backingIndicesAcknowledged: {
            acknowledged: boolean | null;
        };
    }>;
    /**
     * Update datastream to use ILM policy. If legacy indices exist, this attempts to link
     * the ILM policy to them as well.
     */
    migrateIndicesToIlmPolicy(): Promise<{
        putTemplateAcknowledged: boolean;
        backingIndicesAcknowledged: boolean | null;
        legacyAcknowledged: boolean | null;
    }>;
}
