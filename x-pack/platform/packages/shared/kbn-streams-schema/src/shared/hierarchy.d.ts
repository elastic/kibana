export declare const LOGS_ROOT_STREAM_NAME = "logs";
export declare const LOGS_OTEL_STREAM_NAME: "logs.otel";
export declare const LOGS_ECS_STREAM_NAME: "logs.ecs";
export declare const ROOT_STREAM_NAMES: readonly ["logs", "logs.otel", "logs.ecs"];
export type RootStreamName = (typeof ROOT_STREAM_NAMES)[number];
export declare function isDescendantOf(parent: string, child: string): boolean;
export declare function isChildOf(parent: string, child: string): boolean;
/**
 * Check if parent is the direct parent of descendant.
 * This is the inverse of isChildOf - checks from parent's perspective.
 *
 * Examples:
 *   - isParentName("logs.otel", "logs.otel.nginx") → true
 *   - isParentName("logs.otel", "logs.otel.nginx.access") → false (grandparent)
 *   - isParentName("logs", "logs.otel") → false (logs.otel is a root)
 */
export declare function isParentName(parent: string, descendant: string): boolean;
/**
 * Get parent stream ID. Returns undefined for root streams.
 *
 * Examples:
 *   - getParentId("logs.otel") → undefined (root)
 *   - getParentId("logs.otel.nginx") → "logs.otel"
 *   - getParentId("logs.otel.nginx.access") → "logs.otel.nginx"
 */
export declare function getParentId(id: string): string | undefined;
export declare function isRoot(id: string): boolean;
export declare function getRoot(id: string): string;
export declare function getAncestors(id: string): string[];
export declare function getAncestorsAndSelf(id: string): string[];
export declare function getSegments(id: string): string[];
export declare const MAX_NESTING_LEVEL = 5;
