import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { MlApi } from '../../../services/ml_api_service';
interface Dependencies {
    kibanaConfig: IUiSettingsClient;
    timeFilter: TimefilterContract;
    data: DataPublicPluginStart;
    mlApi: MlApi;
    share: SharePluginStart;
}
export declare function resolver(deps: Dependencies, categorizationTypeRisonString: string, dataViewIdRisonString: string, fieldRisonString: string, partitionFieldRisonString: string | null, stopOnWarnRisonString: string, fromRisonString: string, toRisonString: string, queryRisonString: string): Promise<void>;
export {};
