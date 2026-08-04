import type { ResultLinks, FileUploadResults, GetAdditionalLinks } from '@kbn/file-upload-common';
import type { FC } from 'react';
import React from 'react';
import type { FileUploadStartDependencies } from './kibana_context';
export declare const FileDataVisualizerWrapper: FC<{
    getDependencies: () => Promise<FileUploadStartDependencies>;
    resultLinks?: ResultLinks;
    setUploadResults?: (results: FileUploadResults) => void;
    getFieldsStatsGrid?: () => React.FC<any>;
    getAdditionalLinks?: GetAdditionalLinks;
    location: string;
}>;
export declare function getFileDataVisualizerWrapper(getDependencies: () => Promise<FileUploadStartDependencies>, location: string, resultLinks?: ResultLinks, getFieldsStatsGrid?: () => React.FC<any>, setUploadResults?: (results: FileUploadResults) => void, getAdditionalLinks?: GetAdditionalLinks): React.JSX.Element;
