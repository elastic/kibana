import type { CoreStart, Plugin, CoreSetup } from '@kbn/core/public';
import type { AutomaticImportPluginSetup, AutomaticImportPluginStart, AutomaticImportPluginStartDependencies } from './types';
export declare class AutomaticImportPlugin implements Plugin<AutomaticImportPluginSetup, AutomaticImportPluginStart> {
    private telemetry;
    private readonly renderUpselling$;
    setup(core: CoreSetup<AutomaticImportPluginStartDependencies, AutomaticImportPluginStart>): AutomaticImportPluginSetup;
    start(core: CoreStart, dependencies: AutomaticImportPluginStartDependencies): AutomaticImportPluginStart;
    stop(): void;
}
