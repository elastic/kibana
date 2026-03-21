import type { AnalyticsServiceSetup } from '@kbn/core/public';
/**
 * Event types.
 */
export declare const FILE_UPLOAD_EVENT: {
    FILE_ANALYSIS: string;
    FILE_UPLOAD: string;
    UPLOAD_SESSION: string;
};
/**
 * Registers the file upload analytics events.
 */
export declare const registerFileUploadAnalyticsEvents: (analytics: AnalyticsServiceSetup) => void;
