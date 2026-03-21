import React from 'react';
import type { FindFileStructureResponse } from '@kbn/file-upload-common';
export declare function useGrokHighlighter(): (text: string, grokPattern: string, mappings: FindFileStructureResponse["mappings"], ecsCompatibility: string | undefined, multilineStartPattern: string, excludeLinesPattern: string | undefined) => Promise<React.JSX.Element[]>;
