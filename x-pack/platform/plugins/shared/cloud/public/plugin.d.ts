import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { KibanaProductTier, KibanaSolution } from '@kbn/projects-solutions-groups';
import type { CloudSetup, CloudStart } from './types';
export interface CloudConfigType {
    id?: string;
    organization_id?: string;
    cname?: string;
    csp?: string;
    base_url?: string;
    profile_url?: string;
    deployments_url?: string;
    deployment_url?: string;
    projects_url?: string;
    billing_url?: string;
    organization_url?: string;
    users_and_roles_url?: string;
    performance_url?: string;
    trial_end_date?: string;
    isSaasContainer?: boolean;
    is_elastic_staff_owned?: boolean;
    onboarding?: {
        default_solution?: string;
    };
    serverless?: {
        project_id: string;
        project_name?: string;
        project_type?: KibanaSolution;
        product_tier?: KibanaProductTier;
        orchestrator_target?: string;
        in_trial?: boolean;
    };
}
export declare class CloudPlugin implements Plugin<CloudSetup, CloudStart> {
    private readonly initializerContext;
    private readonly config;
    private readonly isCloudEnabled;
    private readonly isServerlessEnabled;
    private readonly contextProviders;
    private readonly logger;
    private elasticsearchConfig?;
    private readonly cloudUrls;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): CloudSetup;
    start(coreStart: CoreStart): CloudStart;
    stop(): void;
    private fetchElasticsearchConfig;
    private trialDaysLeft;
    private isInTrial;
}
