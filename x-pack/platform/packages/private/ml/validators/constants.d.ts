/**
 * Interface for a callout message.
 */
export interface CalloutMessage {
    /**
     * Unique identifier for the callout message.
     */
    id: string;
    /**
     * Heading of the callout message.
     */
    heading: string;
    /**
     * Status of the callout message.
     */
    status: VALIDATION_STATUS;
    /**
     * Text of the callout message.
     */
    text: string;
    /**
     * Optional URL for the callout message.
     */
    url?: string;
}
/**
 * Type for the response of the validate analytics job API.
 */
export type ValidateAnalyticsJobResponse = CalloutMessage[];
/**
 * Enum for the validation status.
 */
export declare enum VALIDATION_STATUS {
    ERROR = "error",
    INFO = "info",
    SUCCESS = "success",
    WARNING = "warning"
}
/**
 * Boolean const for skipping the bucket span estimation.
 */
export declare const SKIP_BUCKET_SPAN_ESTIMATION = true;
/**
 * Const for allowed data units.
 */
export declare const ALLOWED_DATA_UNITS: string[];
/**
 * Const for the maximum length of a job ID.
 */
export declare const JOB_ID_MAX_LENGTH = 64;
/**
 * Const for the upper limit of training documents.
 */
export declare const TRAINING_DOCS_UPPER = 200000;
/**
 * Const for the lower limit of training documents.
 */
export declare const TRAINING_DOCS_LOWER = 200;
/**
 * Const for the threshold of included fields.
 */
export declare const INCLUDED_FIELDS_THRESHOLD = 100;
/**
 * Const for the minimum number of fields for check.
 */
export declare const MINIMUM_NUM_FIELD_FOR_CHECK = 25;
/**
 * Const for the fraction empty limit.
 */
export declare const FRACTION_EMPTY_LIMIT = 0.3;
/**
 * Const for the maximum length of categories.
 */
export declare const NUM_CATEGORIES_THRESHOLD = 10;
/**
 * Const for all categories.
 */
export declare const ALL_CATEGORIES = -1;
