import type { FormatColumnArgs } from '.';
export declare const supportedFormats: Record<string, {
    formatId: string;
    decimalsToPattern: (decimals?: number, compact?: boolean) => string;
    translateToFormatParams?: (params: Omit<FormatColumnArgs, 'format' | 'columnId' | 'parentFormat'>) => Record<string, unknown>;
}>;
