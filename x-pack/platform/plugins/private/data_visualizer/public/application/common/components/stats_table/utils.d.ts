import type { FileBasedFieldVisConfig } from './types';
export declare const getTFPercentage: (config: FileBasedFieldVisConfig) => {
    count: number;
    trueCount: number;
    falseCount: number;
} | null;
export declare const calculateTableColumnsDimensions: (width?: number) => {
    expander: string;
    type: string;
    docCount: string;
    distinctValues: string;
    distributions: string;
    showIcon: boolean;
    breakPoint: string;
};
