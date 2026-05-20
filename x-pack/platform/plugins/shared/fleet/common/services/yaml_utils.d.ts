/**
 * Minimal shape of the yaml module required by these utils.
 * Callers pass the actual yaml module (from static import or loadYaml()) so that
 * common code does not statically import 'yaml' and pull it into the browser bundle.
 */
export interface YamlModule {
    Document: new (data: unknown, options?: any) => {
        toString(): string;
    };
    isScalar: (node: unknown) => boolean;
}
/**
 * Pair-like shape for YAML key sorting (key may be a scalar with .value).
 */
export interface YamlPairLike {
    key: {
        value?: unknown;
    };
}
/**
 * Creates a YAML key sorter function based on a defined key order.
 * Keys in the order array are sorted first, in the specified order.
 * Keys not in the array are sorted after, maintaining their relative order.
 */
export declare function createYamlKeysSorter(keyOrder: string[], yaml: YamlModule): (a: YamlPairLike, b: YamlPairLike) => number;
/**
 * Converts data to YAML string using the yaml package Document API.
 * This is the standard toYaml implementation used across Fleet.
 */
export declare function toYaml(data: unknown, options: unknown, yaml: YamlModule): string;
