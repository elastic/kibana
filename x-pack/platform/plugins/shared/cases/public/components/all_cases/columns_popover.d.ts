import React from 'react';
import type { CasesColumnSelection } from './types';
interface Props {
    selectedColumns: CasesColumnSelection[];
    onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
}
export declare const ColumnsPopover: React.FC<Props>;
export {};
