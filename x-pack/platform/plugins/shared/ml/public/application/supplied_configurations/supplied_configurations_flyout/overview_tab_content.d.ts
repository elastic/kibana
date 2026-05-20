import type { FC } from 'react';
import React from 'react';
import type { Module } from '@kbn/ml-common-types/modules';
import type { TabIdType, KibanaAssetType } from './flyout';
export declare const LABELS: {
    dashboard: React.JSX.Element;
    jobs: React.JSX.Element;
    search: React.JSX.Element;
    visualization: React.JSX.Element;
};
export type LabelId = keyof typeof LABELS;
interface Props {
    module: Module;
    setSelectedTabId: (tabId: TabIdType) => void;
    setSelectedKibanaSubTab: (kibanaSubTab: KibanaAssetType) => void;
}
export declare const OverviewTabContent: FC<Props>;
export {};
