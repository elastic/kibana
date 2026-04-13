import { type StreamType } from '@kbn/streamlang';
/**
 * Generate JSON Schema from Streamlang Zod schema for Monaco YAML validation
 *
 * @param streamType - Optional stream type to filter available actions
 * Returns null if schema generation fails, allowing fallback to basic syntax highlighting
 */
export declare function generateStreamlangJsonSchema(streamType?: StreamType): object | null;
/**
 * Get Monaco YAML schema configuration for Streamlang
 *
 * @param streamType - Optional stream type to filter available actions
 */
export declare function getStreamlangMonacoSchemaConfig(streamType?: StreamType): {
    uri: string;
    fileMatch: string[];
    schema: object;
} | null;
