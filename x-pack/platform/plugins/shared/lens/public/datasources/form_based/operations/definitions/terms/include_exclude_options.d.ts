import React from 'react';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
export interface IncludeExcludeOptions {
    label: string;
}
export interface IncludeExcludeRowProps {
    include?: string[] | number[];
    exclude?: string[] | number[];
    tableRows?: DatatableRow[];
    columnId: string;
    isNumberField: boolean;
    includeIsRegex: boolean;
    excludeIsRegex: boolean;
    updateParams: (operation: string, operationValue: Array<string | number>, regexParam: string, regexValue: boolean) => void;
}
export declare const IncludeExcludeRow: ({ include, exclude, tableRows, columnId, isNumberField, includeIsRegex, excludeIsRegex, updateParams, }: IncludeExcludeRowProps) => React.JSX.Element;
