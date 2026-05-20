export declare const keepFields: readonly string[];
export declare const namespacePrefixes: readonly string[];
/**
 * Field names that are reserved for OTel compatibility mode.
 * These are either passthrough objects or alias fields that cannot be used as custom field names.
 * IMPORTANT: This list must match the keys of baseMappings in logs_layer.ts.
 * A test in logs_layer.test.ts ensures these stay in sync.
 */
export declare const otelReservedFields: readonly ["body", "attributes", "scope", "resource", "span.id", "message", "trace.id", "log.level"];
export declare const aliases: Record<string, string>;
export declare function getRegularEcsField(field: string): string;
export declare function isNamespacedEcsField(field: string): boolean;
/**
 * Checks if a field name is reserved for OTel compatibility mode.
 * Reserved fields are either passthrough objects or alias fields that cannot be redefined.
 */
export declare function isOtelReservedField(field: string): boolean;
