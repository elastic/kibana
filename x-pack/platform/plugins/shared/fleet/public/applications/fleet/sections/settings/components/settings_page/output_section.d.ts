import React from 'react';
import type { Output } from '../../../../types';
export interface OutputSectionProps {
    outputs: Output[];
    deleteOutput: (output: Output) => void;
}
export declare const OutputSection: React.FunctionComponent<OutputSectionProps>;
