import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public/types';
import type { FormatFactory } from '../../../common/types';
export interface CSVSharingData {
    title: string;
    datatables: Datatable[];
    csvEnabled: boolean;
}
declare global {
    interface Window {
        /**
         * Debug setting to test CSV download
         */
        ELASTIC_LENS_CSV_DOWNLOAD_DEBUG?: boolean;
        ELASTIC_LENS_CSV_CONTENT?: Record<string, {
            content: string;
            type: string;
        }>;
    }
}
interface DownloadPanelShareOpts {
    uiSettings: IUiSettingsClient;
    formatFactoryFn: () => FormatFactory;
    atLeastGold: () => boolean;
}
export declare const downloadCsvLensShareProvider: ({ uiSettings, formatFactoryFn, atLeastGold, }: DownloadPanelShareOpts) => RegisterShareIntegrationArgs<ExportShare>;
export {};
