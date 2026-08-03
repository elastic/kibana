/**
 * The number of category examples to use for analysis.
 */
export declare const CATEGORY_EXAMPLES_SAMPLE_SIZE = 1000;
/**
 * The warning limit for category examples. If the category examples validation falls below this limit, a warning is triggered.
 */
export declare const CATEGORY_EXAMPLES_WARNING_LIMIT = 0.75;
/**
 * The error limit for category examples. If the category examples validation falls below this limit, an error is triggered.
 */
export declare const CATEGORY_EXAMPLES_ERROR_LIMIT = 0.02;
/**
 * The valid token count for category examples.
 */
export declare const VALID_TOKEN_COUNT = 3;
/**
 * The limit for the percentage of null values in category examples.
 */
export declare const NULL_COUNT_PERCENT_LIMIT = 0.75;
/**
 * Enum representing the validation status of category examples.
 */
export declare enum CATEGORY_EXAMPLES_VALIDATION_STATUS {
    VALID = "valid",
    PARTIALLY_VALID = "partially_valid",
    INVALID = "invalid"
}
/**
 * Enum representing the validation results for field examples.
 */
export declare enum VALIDATION_RESULT {
    NO_EXAMPLES = 0,
    FAILED_TO_TOKENIZE = 1,
    TOO_MANY_TOKENS = 2,
    TOKEN_COUNT = 3,
    NULL_VALUES = 4,
    INSUFFICIENT_PRIVILEGES = 5
}
/**
 * Description for each validation result.
 */
export declare const VALIDATION_CHECK_DESCRIPTION: {
    /**
     * Examples were successfully loaded.
     */
    0: string;
    /**
     * The loaded examples were tokenized successfully.
     */
    1: string;
    /**
     * More than {tokenCount} tokens per example were found in over {percentage}% of the loaded examples.
     */
    3: string;
    /**
     * Less than {percentage}% of the loaded examples were null.
     */
    4: string;
    /**
     * Less than 10000 tokens were found in total in the loaded examples.
     */
    2: string;
    /**
     * The user has sufficient privileges to perform the checks.
     */
    5: string;
};
