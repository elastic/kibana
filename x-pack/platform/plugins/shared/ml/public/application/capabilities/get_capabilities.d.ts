import type { MlCapabilitiesResponse } from '@kbn/ml-common-types/capabilities';
import type { MlApi } from '../services/ml_api_service';
export declare function getCapabilities(mlApi: MlApi): Promise<MlCapabilitiesResponse>;
