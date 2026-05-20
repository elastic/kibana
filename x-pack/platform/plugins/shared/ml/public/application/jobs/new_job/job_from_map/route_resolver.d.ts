import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { MlApi } from '../../../services/ml_api_service';
interface Dependencies {
    dataViews: DataViewsContract;
    kibanaConfig: IUiSettingsClient;
    timeFilter: TimefilterContract;
    share: SharePluginStart;
    mlApi: MlApi;
}
export declare function resolver(deps: Dependencies, dashboardRisonString: string, dataViewIdRisonString: string, embeddableRisonString: string, geoFieldRisonString: string, splitFieldRisonString: string, fromRisonString: string, toRisonString: string, layerRisonString?: string): Promise<void>;
export {};
