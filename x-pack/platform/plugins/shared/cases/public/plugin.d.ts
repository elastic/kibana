import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { CasesPublicSetup, CasesPublicStart, CasesPublicSetupDependencies, CasesPublicStartDependencies } from './types';
/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export declare class CasesUiPlugin implements Plugin<CasesPublicSetup, CasesPublicStart, CasesPublicSetupDependencies, CasesPublicStartDependencies> {
    private readonly initializerContext;
    private readonly kibanaVersion;
    private readonly storage;
    private externalReferenceAttachmentTypeRegistry;
    private persistableStateAttachmentTypeRegistry;
    private unifiedAttachmentTypeRegistry;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup, plugins: CasesPublicSetupDependencies): CasesPublicSetup;
    start(core: CoreStart, plugins: CasesPublicStartDependencies): CasesPublicStart;
    stop(): void;
}
