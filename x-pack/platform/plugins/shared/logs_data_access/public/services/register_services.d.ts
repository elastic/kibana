import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ISearchStart } from '@kbn/data-plugin/public';
export interface RegisterServicesParams {
    deps: {
        uiSettings: IUiSettingsClient;
        search: ISearchStart;
    };
}
export declare function registerServices(params: RegisterServicesParams): {
    logSourcesService: import("../../common/types").LogSourcesService;
    logDataService: import("./log_data_service").LogDataService;
};
