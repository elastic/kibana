import type { TableHTMLAttributes } from 'react';
import React from 'react';
import type { EuiTableProps } from '@elastic/eui';
import type { KeyValuePair } from './utils/get_flattened_key_value_pairs';
export declare function KeyValueTable({ keyValuePairs, tableProps, dateFormat, dateTimezone, }: {
    keyValuePairs: KeyValuePair[];
    tableProps?: EuiTableProps & TableHTMLAttributes<HTMLTableElement>;
    dateFormat?: string;
    dateTimezone?: string;
}): React.JSX.Element;
