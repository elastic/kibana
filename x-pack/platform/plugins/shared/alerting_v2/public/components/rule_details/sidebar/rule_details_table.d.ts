import React from 'react';
import type { ReactNode } from 'react';
export interface RuleDetailsTableItem {
    title: ReactNode;
    description?: ReactNode;
    'data-test-subj'?: string;
    fullWidthContent?: ReactNode;
}
export interface RuleDetailsTableProps {
    items: RuleDetailsTableItem[];
}
export declare const RuleDetailsTable: React.FunctionComponent<RuleDetailsTableProps>;
