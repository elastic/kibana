import type { FC } from 'react';
import type { InitialSettings } from './use_data_drift_result';
interface PageHeaderProps {
    onRefresh: () => void;
    needsUpdate: boolean;
}
export declare const PageHeader: FC<PageHeaderProps>;
interface Props {
    initialSettings: InitialSettings;
}
export declare const DataDriftPage: FC<Props>;
export {};
