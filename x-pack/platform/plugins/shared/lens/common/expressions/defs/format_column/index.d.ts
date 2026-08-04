import type { FormatColumnExpressionFunction } from './types';
export interface FormatColumnArgs {
    format: string;
    columnId: string;
    decimals?: number;
    suffix?: string;
    compact?: boolean;
    pattern?: string;
    parentFormat?: string;
    fromUnit?: string;
    toUnit?: string;
}
export declare const formatColumn: FormatColumnExpressionFunction;
