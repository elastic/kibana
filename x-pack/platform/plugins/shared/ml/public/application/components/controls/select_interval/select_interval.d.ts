import type { FC } from 'react';
import { type UrlStateService } from '@kbn/ml-url-state';
export interface TableInterval {
    display: string;
    val: string;
}
export declare const TABLE_INTERVAL_DEFAULT: TableInterval;
export declare const useTableInterval: () => [TableInterval, (v: TableInterval) => void, UrlStateService<TableInterval>];
export declare const SelectInterval: FC;
interface SelectIntervalUIProps {
    interval: TableInterval;
    onChange: (interval: TableInterval) => void;
}
export declare const SelectIntervalUI: FC<SelectIntervalUIProps>;
export {};
