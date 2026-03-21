import type { AgentBuilderConfig } from '../config';
import type { InternalSetupServices, InternalStartServices, ServicesStartDeps, ServiceSetupDeps } from './types';
export declare class ServiceManager {
    private services?;
    internalSetup?: InternalSetupServices;
    internalStart?: InternalStartServices;
    private readonly config;
    constructor(config: AgentBuilderConfig);
    setupServices({ logger, workflowsManagement, cloud, usageApi, }: ServiceSetupDeps): InternalSetupServices;
    startServices({ logger, security, spaces, elasticsearch, inference, uiSettings, savedObjects, featureFlags, actions, taskManager, securityPlugin, trackingService, analyticsService, }: ServicesStartDeps): InternalStartServices;
}
