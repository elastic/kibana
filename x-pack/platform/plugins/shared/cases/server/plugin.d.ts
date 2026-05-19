import { type PluginInitializerContext, type CoreSetup, type CoreStart, type Plugin } from '@kbn/core/server';
import type { CasesServerSetup, CasesServerSetupDependencies, CasesServerStart, CasesServerStartDependencies } from './types';
export declare class CasePlugin implements Plugin<CasesServerSetup, CasesServerStart, CasesServerSetupDependencies, CasesServerStartDependencies> {
    private readonly initializerContext;
    private readonly caseConfig;
    private readonly logger;
    private readonly kibanaVersion;
    private clientFactory;
    private securityPluginSetup?;
    private lensEmbeddableFactory?;
    private persistableStateAttachmentTypeRegistry;
    private externalReferenceAttachmentTypeRegistry;
    private unifiedAttachmentTypeRegistry;
    private userProfileService;
    private incrementalIdTaskManager?;
    private usageCounter?;
    private readonly isServerless;
    private casesEventBus?;
    private readonly closeReasonValidators;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<CasesServerStartDependencies>, plugins: CasesServerSetupDependencies): CasesServerSetup;
    start(core: CoreStart, plugins: CasesServerStartDependencies): CasesServerStart;
    stop(): void;
    private createRouteHandlerContext;
    private getCasesClientWithRequest;
}
