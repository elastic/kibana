import type { FC } from 'react';
import type { Module } from '@kbn/ml-common-types/modules';
interface Props {
    module: Module;
    onClose: () => void;
}
export declare const TAB_IDS: {
    readonly OVERVIEW: "overview";
    readonly JOBS: "jobs";
    readonly KIBANA: "kibana";
};
export type TabIdType = (typeof TAB_IDS)[keyof typeof TAB_IDS];
export declare const KIBANA_ASSETS: {
    readonly VISUALIZATION: "visualization";
    readonly DASHBOARD: "dashboard";
    readonly SEARCH: "search";
};
export type KibanaAssetType = (typeof KIBANA_ASSETS)[keyof typeof KIBANA_ASSETS];
export declare const SuppliedConfigurationsFlyout: FC<Props>;
export {};
