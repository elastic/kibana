import { type StreamlangDSL, type Condition } from '@kbn/streamlang';
/**
 * Validates a parsed JSON object against the Streamlang DSL schema.
 * On success, returns { success: true, data: StreamlangDSL }.
 * On failure, returns { success: false, error: string } with a clean,
 * narrowed error message (not the full Zod union noise).
 */
export declare const validateProcessingJson: (json: unknown) => {
    success: true;
    data: StreamlangDSL;
} | {
    success: false;
    error: string;
};
/**
 * Validates a parsed JSON object against the Streamlang condition schema.
 * On success, returns { success: true, data: Condition }.
 * On failure, returns { success: false, error: string } with a clean error.
 */
export declare const validateConditionJson: (json: unknown) => {
    success: true;
    data: Condition;
} | {
    success: false;
    error: string;
};
