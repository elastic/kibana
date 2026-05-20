import type { FC } from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
export interface TableSeverityPageUrlState {
    pageKey: 'mlSelectSeverity';
    pageUrlState: TableSeverityState;
}
export interface TableSeverity {
    val: number;
    display: string;
    color: string;
    threshold: SeverityThreshold;
}
export interface TableSeverityState {
    val: SeverityThreshold[];
}
/**
 * React hook that returns the default table severity state
 */
export declare const useDefaultSeverity: () => {
    val: Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[];
};
/**
 * React hook that provides table severity url state management
 */
export declare const useTableSeverity: () => readonly [{
    val: Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[];
}, (update: Partial<TableSeverityState>, replaceState?: boolean) => void, import("@kbn/ml-url-state").UrlStateService<TableSeverityState>];
/**
 * Helper function to get severity range display value
 */
export declare const getSeverityRangeDisplay: (val: number) => string;
interface Props {
    classNames?: string;
}
export declare const SelectSeverity: FC<Props>;
export declare const SelectSeverityUI: FC<Omit<EuiSuperSelectProps<string>, 'onChange' | 'options'> & {
    classNames?: string;
    severity: SeverityThreshold[];
    onChange: (selectedSeverities: TableSeverity[]) => void;
}>;
export {};
