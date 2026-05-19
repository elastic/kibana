import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { AnalysisResult } from '@kbn/file-upload-common';
import type { FileUploadPluginStartApi } from '@kbn/file-upload-plugin/public/api';
export declare class DocCountService {
    private fileUpload;
    private onIndexSearchable;
    private onAllDocsSearchable;
    private indexName;
    private indexSearchableSubscription;
    private allDocsSearchableSubscription;
    private initialDocCount;
    constructor(fileUpload: FileUploadPluginStartApi, onIndexSearchable: (indexName: string) => void, onAllDocsSearchable: (indexName: string) => void);
    destroy(): void;
    startIndexSearchableCheck(indexName: string): void;
    startAllDocsSearchableCheck(indexName: string, totalDocCount: number): void;
    private isSearchable$;
    loadInitialIndexCount(indexName: string): Promise<void>;
    resetInitialDocCount(): void;
}
export declare function getSampleDocs(data: DataPublicPluginStart, analysisResult: AnalysisResult, fileName: string): Promise<DataTableRecord[]>;
