import type { FC, PropsWithChildren } from 'react';
export interface ApiKeysEmptyPromptProps {
    error?: Error;
    readOnly?: boolean;
}
export declare const ApiKeysEmptyPrompt: FC<PropsWithChildren<ApiKeysEmptyPromptProps>>;
export declare function doesErrorIndicateBadQuery(error: Record<string, any>): boolean;
