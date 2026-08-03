import React from 'react';
import type { FieldDataRowProps } from '../../types/field_data_row';
interface Props extends FieldDataRowProps {
    showIcon?: boolean;
    totalCount?: number;
}
export declare const DocumentStat: ({ config, showIcon, totalCount }: Props) => React.JSX.Element | null;
export {};
