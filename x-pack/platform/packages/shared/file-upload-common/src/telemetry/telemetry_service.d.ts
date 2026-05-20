import type { AnalyticsServiceStart } from '@kbn/core/public';
interface FileAnalysisEvent {
    upload_session_id: string;
    file_id: string;
    file_type: string;
    file_extension: string;
    file_size_bytes: number;
    num_lines_analyzed: number;
    num_messages_analyzed: number;
    java_timestamp_formats: string;
    num_fields_found: number;
    delimiter: string;
    preview_success: boolean;
    analysis_success: boolean;
    analysis_cancelled: boolean;
    overrides_used: boolean;
    analysis_time_ms: number;
    location?: string;
}
interface FileUploadEvent {
    upload_session_id: string;
    file_id: string;
    mapping_clash_new_fields: number;
    mapping_clash_missing_fields: number;
    file_size_bytes: number;
    documents_success: number;
    documents_failed: number;
    upload_success: boolean;
    upload_cancelled: boolean;
    upload_time_ms: number;
    file_extension: string;
    location?: string;
}
interface UploadSessionEvent {
    upload_session_id: string;
    total_files: number;
    total_size_bytes: number;
    session_success: boolean;
    session_cancelled: boolean;
    session_time_ms: number;
    new_index_created: boolean;
    data_view_created: boolean;
    mapping_clash_total_new_fields: number;
    mapping_clash_total_missing_fields: number;
    contains_auto_added_semantic_text_field: boolean;
    location?: string;
}
export declare class FileUploadTelemetryService {
    private analytics;
    private location;
    constructor(analytics: AnalyticsServiceStart, location: string);
    static generateId(): string;
    static getFileExtension(fileName: string): string;
    private reportEvent;
    trackAnalyzeFile(fileUploadEvent: FileAnalysisEvent): void;
    trackUploadFile(fileUploadEvent: FileUploadEvent): void;
    trackUploadSession(uploadSessionEvent: UploadSessionEvent): void;
}
export {};
