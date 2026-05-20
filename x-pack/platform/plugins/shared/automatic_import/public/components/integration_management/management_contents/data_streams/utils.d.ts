import type { EuiTokenProps } from '@elastic/eui';
export declare const getIconFromType: (type: string | null | undefined) => EuiTokenProps["iconType"];
export declare const isValidIp: (value: string) => boolean;
export declare const getFieldType: (value: unknown) => string;
export declare const diffPipelineLines: (original: string, updated: string) => {
    linesAdded: number;
    linesRemoved: number;
    netLineChange: number;
};
export declare const flattenPipelineObject: (obj: Record<string, unknown>, parentKey?: string) => Array<{
    field: string;
    value: string;
    type: string;
}>;
