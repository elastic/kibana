/**
 * Generates a duplicate name by incrementing the numeric suffix.
 *
 * If the input name ends with an underscore followed by a number (e.g., "document_5"),
 * the function increments that number. If the name has no numeric suffix,
 * it appends "_1" to create the first duplicate.
 *
 * @param name - The original name to duplicate
 * @returns A new name with an incremented numeric suffix
 *
 * @example
 * ```typescript
 * duplicateName("my_tool");      // Returns "my_tool_1"
 * duplicateName("my_agent_1");    // Returns "my_agent_2"
 * ```
 */
export declare const duplicateName: (name: string) => string;
