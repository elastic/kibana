import type { FC } from 'react';
import type { InputOverrides } from '@kbn/file-upload-common';
import type { FileAnalysis } from '../../../../file_upload_manager';
interface Props {
    fileStatus: FileAnalysis;
    analyzeFileWithOverrides: (overrides: InputOverrides) => void;
    index: number;
}
export declare const AnalysisOverrides: FC<Props>;
export {};
