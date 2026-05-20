import type { estypes } from '@elastic/elasticsearch';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { MlInfoResponse } from '@kbn/ml-common-types/ml_server_info';
import type { MlCapabilitiesResponse, ResolveMlCapabilities } from '@kbn/ml-common-types/capabilities';
import type { GetGuards } from '../shared_services';
import type { MlLicense } from '../../../common/license';
export interface MlSystemProvider {
    mlSystemProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        mlCapabilities(): Promise<MlCapabilitiesResponse>;
        mlInfo(): Promise<MlInfoResponse>;
        mlAnomalySearch<T>(searchParams: any, jobIds: string[]): Promise<estypes.SearchResponse<T>>;
    };
}
export declare function getMlSystemProvider(getGuards: GetGuards, mlLicense: MlLicense, getSpaces: (() => Promise<SpacesPluginStart>) | undefined, cloud: CloudSetup | undefined, resolveMlCapabilities: ResolveMlCapabilities): MlSystemProvider;
