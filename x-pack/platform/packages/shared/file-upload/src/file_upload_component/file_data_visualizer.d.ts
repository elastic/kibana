import type { FC } from 'react';
import React from 'react';
import type { FileUploadResults, FindFileStructureResponse, GetAdditionalLinks, OpenFileUploadLiteContext, ResultLinks } from '@kbn/file-upload-common';
import type { FileUploadStartDependencies } from './kibana_context';
export interface Props {
    dependencies: FileUploadStartDependencies;
    location: string;
    resultLinks?: ResultLinks;
    getAdditionalLinks?: GetAdditionalLinks;
    setUploadResults?: (results: FileUploadResults) => void;
    props?: OpenFileUploadLiteContext;
    getFieldsStatsGrid?: () => React.FC<{
        results: FindFileStructureResponse | null;
    }>;
}
export type FileDataVisualizerSpec = typeof FileDataVisualizer;
export declare const FileDataVisualizer: FC<Props>;
export default FileDataVisualizer;
