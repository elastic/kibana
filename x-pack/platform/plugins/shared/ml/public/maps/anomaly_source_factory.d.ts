import type { StartServicesAccessor } from '@kbn/core/public';
import { SOURCE_TYPES } from '@kbn/maps-plugin/common';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
export declare class AnomalySourceFactory {
    private getStartServices;
    readonly type = SOURCE_TYPES.ES_ML_ANOMALIES;
    constructor(getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>);
    private getServices;
    create(): Promise<any>;
}
