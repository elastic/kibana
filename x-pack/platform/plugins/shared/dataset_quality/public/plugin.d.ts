import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DatasetQualityPluginSetup, DatasetQualityPluginStart, DatasetQualitySetupDeps, DatasetQualityStartDeps } from './types';
export declare class DatasetQualityPlugin implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart> {
    private telemetry;
    setup(core: CoreSetup, plugins: DatasetQualitySetupDeps): {};
    start(core: CoreStart, plugins: DatasetQualityStartDeps): DatasetQualityPluginStart;
}
