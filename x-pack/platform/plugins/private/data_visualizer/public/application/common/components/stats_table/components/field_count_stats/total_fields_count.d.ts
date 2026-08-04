import type { FC } from 'react';
export interface TotalFieldsStats {
    visibleFieldsCount: number;
    totalFieldsCount: number;
}
export interface TotalFieldsCountProps {
    fieldsCountStats?: TotalFieldsStats;
}
export declare const TotalFieldsCount: FC<TotalFieldsCountProps>;
