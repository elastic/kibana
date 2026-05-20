import type { DataView } from '@kbn/data-views-plugin/public';
import { type Field } from '@kbn/ml-anomaly-utils';
import type { MlApi } from '../ml_api_service';
import { NewJobCapabilitiesServiceBase } from './new_job_capabilities';
export declare class NewJobCapsService extends NewJobCapabilitiesServiceBase {
    private _catFields;
    private _dateFields;
    private _geoFields;
    private _includeEventRateField;
    private _removeTextFields;
    private _mlApiService;
    constructor(mlApiService: MlApi);
    get catFields(): Field[];
    get dateFields(): Field[];
    get geoFields(): Field[];
    get categoryFields(): Field[];
    initializeFromDataVIew(dataView: DataView, includeEventRateField?: boolean, removeTextFields?: boolean): Promise<void>;
}
export declare const mlJobCapsServiceFactory: (mlApi: MlApi) => NewJobCapsService;
export declare const useNewJobCapsService: () => NewJobCapsService;
