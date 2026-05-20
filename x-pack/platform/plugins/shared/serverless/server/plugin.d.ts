import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ServerlessServerSetup, ServerlessServerStart, ServerlessServerSetupDependencies, ServerlessServerStartDependencies } from './types';
export declare class ServerlessPlugin implements Plugin<ServerlessServerSetup, ServerlessServerStart, ServerlessServerSetupDependencies, ServerlessServerStartDependencies> {
    private projectSettingsAdded;
    private setupProjectSettings;
    constructor();
    setup(core: CoreSetup): {
        setupProjectSettings: (keys: string[]) => void;
    };
    start(_core: CoreStart): {};
    stop(): void;
}
