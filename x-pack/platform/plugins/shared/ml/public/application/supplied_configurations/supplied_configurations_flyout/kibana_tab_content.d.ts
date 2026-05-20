import type { FC } from 'react';
import type { Module } from '@kbn/ml-common-types/modules';
import type { KibanaAssetType } from './flyout';
interface Props {
    module: Module;
    selectedKibanaSubTab?: KibanaAssetType;
}
export declare const KibanaTabContent: FC<Props>;
export {};
