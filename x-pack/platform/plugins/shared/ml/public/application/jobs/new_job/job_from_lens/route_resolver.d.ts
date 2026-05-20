import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { MlApi } from '../../../services/ml_api_service';
interface Dependencies {
    lens: LensPublicStart;
    dataViews: DataViewsContract;
    kibanaConfig: IUiSettingsClient;
    timeFilter: TimefilterContract;
    share: SharePluginStart;
    mlApi: MlApi;
}
export declare function resolver(deps: Dependencies, lensSavedObjectRisonString: string | undefined, fromRisonString: string, toRisonString: string, queryRisonString: string, filtersRisonString: string, layerIndexRisonString: string): Promise<void>;
export {};
