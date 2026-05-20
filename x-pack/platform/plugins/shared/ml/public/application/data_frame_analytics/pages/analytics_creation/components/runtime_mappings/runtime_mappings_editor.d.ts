import type { FC } from 'react';
import React from 'react';
interface Props {
    convertToJson: (data: string) => string;
    setAdvancedRuntimeMappingsConfig: React.Dispatch<string>;
    setIsRuntimeMappingsEditorApplyButtonEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    advancedEditorRuntimeMappingsLastApplied: string | undefined;
    advancedRuntimeMappingsConfig: string;
}
export declare const RuntimeMappingsEditor: FC<Props>;
export {};
