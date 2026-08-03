import React from 'react';
import type { CasesColumnSelection } from '../types';
interface Props {
    selectedColumns: CasesColumnSelection[];
    onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
    buttonLabel?: string;
    buttonIconType?: string;
}
export declare const ColumnsPopover: React.FC<Props>;
export {};
