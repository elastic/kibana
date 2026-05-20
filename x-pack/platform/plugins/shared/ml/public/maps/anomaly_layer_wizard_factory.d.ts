import type { StartServicesAccessor } from '@kbn/core/public';
import type { LayerWizard } from '@kbn/maps-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
export declare const ML_ANOMALY = "ML_ANOMALIES";
export declare class AnomalyLayerWizardFactory {
    private getStartServices;
    private canGetJobs;
    private canCreateJobs;
    readonly type = "ML_ANOMALIES";
    constructor(getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>, canGetJobs: boolean, canCreateJobs: boolean);
    private getServices;
    create(): Promise<LayerWizard>;
}
