import React from 'react';
import type { Output } from '../../../../types';
export interface OutputsTableProps {
    outputs: Output[];
    deleteOutput: (output: Output) => void;
}
export declare const OutputsTable: React.FunctionComponent<OutputsTableProps>;
