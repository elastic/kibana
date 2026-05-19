import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SolutionId } from '@kbn/core-chrome-browser';
import type { KibanaProductTier, KibanaSolution } from '@kbn/projects-solutions-groups';
interface PluginsSetup {
    usageCollection?: UsageCollectionSetup;
}
/**
 * Setup contract
 */
export interface CloudSetup {
    /**
     * This is the ID of the Cloud deployment to which the Kibana instance belongs.
     *
     * @example `eastus2.azure.elastic-cloud.com:9243$59ef636c6917463db140321484d63cfa$a8b109c08adc43279ef48f29af1a3911`
     *
     * @note The `cloudId` is a concatenation of the deployment name and a hash. Users can update the deployment name, changing the `cloudId`. However, the changed `cloudId` will not be re-injected into `kibana.yml`. If you need the current `cloudId` the best approach is to split the injected `cloudId` on the semi-colon, and replace the first element with the `persistent.cluster.metadata.display_name` value as provided by a call to `GET _cluster/settings`.
     */
    cloudId?: string;
    /**
     * The cloud service provider identifier.
     *
     * @note Expected to be one of `aws`, `gcp` or `azure`, but could be something different.
     */
    csp?: string;
    /**
     * The Elastic Cloud Organization that owns this deployment/project.
     */
    organizationId?: string;
    /**
     * The deployment's ID. Only available when running on Elastic Cloud.
     */
    deploymentId?: string;
    /**
     * The full URL to the elasticsearch cluster.
     */
    elasticsearchUrl?: string;
    /**
     * The full URL to the Kibana deployment.
     */
    kibanaUrl?: string;
    /**
     * This is the URL to the "projects" interface on cloud.
     *
     * @example `https://cloud.elastic.co/projects`
     */
    projectsUrl?: string;
    /**
     * This is the URL of the Cloud interface.
     *
     * @example `https://cloud.elastic.co` (on the ESS production environment)
     */
    baseUrl?: string;
    /**
     * {host} of the deployment url https://<deploymentId>.<application>.<host><?:port>
     */
    cloudHost?: string;
    /**
     * {port} of the deployment url https://<deploymentId>.<application>.<host><?:port>
     */
    cloudDefaultPort?: string;
    /**
     * This is set to `true` for both ESS and ECE deployments.
     */
    isCloudEnabled: boolean;
    /**
     * The size of the instance in which Kibana is running. Only available when running on Elastic Cloud.
     */
    instanceSizeMb?: number;
    /**
     * When the Cloud Trial ends/ended for the organization that owns this deployment. Only available when running on Elastic Cloud.
     */
    trialEndDate?: Date;
    /**
     * `true` if the Elastic Cloud organization that owns this deployment is owned by an Elastician. Only available when running on Elastic Cloud.
     */
    isElasticStaffOwned?: boolean;
    /**
     * APM configuration keys.
     */
    apm: {
        url?: string;
        secretToken?: string;
    };
    /**
     * Onboarding configuration.
     */
    onboarding: {
        /**
         * The default solution selected during onboarding.
         */
        defaultSolution?: SolutionId;
    };
    /**
     * `true` when running on ECE (Elastic Cloud Enterprise).
     * `false` or `undefined` on ESS or self-managed.
     */
    isEce?: boolean;
    /**
     * `true` when running on Serverless Elastic Cloud
     * Note that `isCloudEnabled` will always be true when `isServerlessEnabled` is.
     */
    isServerlessEnabled: boolean;
    /**
     * Serverless configuration.
     *
     * @note We decided to place any cloud URL values at the top level of this object
     *       even if they contain serverless specific values. All other serverless
     *       config should live in this object.
     */
    serverless: {
        /**
         * The serverless projectId.
         * Will always be present if `isServerlessEnabled` is `true`
         */
        projectId?: string;
        /**
         * The serverless project name.
         * Will always be present if `isServerlessEnabled` is `true`
         */
        projectName?: string;
        /**
         * The serverless project type.
         * Will always be present if `isServerlessEnabled` is `true`
         */
        projectType?: KibanaSolution;
        /**
         * The serverless product tier.
         * Only present if the current project type has product tiers defined.
         * @remarks This field is only exposed for informational purposes. Use the `core.pricing` when checking if a feature is available for the current product tier.
         * @internal
         */
        productTier?: KibanaProductTier;
        /**
         * The serverless orchestrator target. The potential values are `canary` or `non-canary`
         * Will always be present if `isServerlessEnabled` is `true`
         */
        orchestratorTarget?: string;
        /**
         * Whether the serverless project belongs to an organization currently in trial.
         */
        organizationInTrial?: boolean;
    };
    /**
     * Method to retrieve if the organization is in trial.
     */
    isInTrial: () => boolean;
    /**
     * Method to retrieve the number of days left in the trial.
     * Returns undefined if trial_end_date is not set, or the number of days remaining (0 if expired).
     */
    trialDaysLeft: () => number | undefined;
}
/**
 * Start contract
 */
export interface CloudStart {
    /**
     * This is set to `true` for both ESS and ECE deployments.
     */
    isCloudEnabled: boolean;
    /**
     * This is the URL to the "projects" interface on cloud.
     *
     * @example `https://cloud.elastic.co/projects`
     */
    projectsUrl?: string;
    /**
     * This is the URL of the Cloud interface.
     *
     * @example `https://cloud.elastic.co` (on the ESS production environment)
     */
    baseUrl?: string;
    /**
     * Method to retrieve if the organization is in trial.
     */
    isInTrial: () => boolean;
    /**
     * Method to retrieve the number of days left in the trial.
     * Returns undefined if trial_end_date is not set, or the number of days remaining (0 if expired).
     */
    trialDaysLeft: () => number | undefined;
}
export declare class CloudPlugin implements Plugin<CloudSetup, CloudStart> {
    private readonly context;
    private readonly config;
    private readonly logger;
    private readonly trialEndDate;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup, { usageCollection }: PluginsSetup): CloudSetup;
    start(): CloudStart;
    private getCloudUrls;
    private trialDaysLeft;
    private isInTrial;
}
export {};
