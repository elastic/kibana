/**
 * The backends the API tools (`discover_apis`, `describe_api`, `execute_api`) can operate on.
 */
export declare const apiTargets: readonly ['elasticsearch', 'kibana'];
/**
 * The backend an API operation belongs to.
 */
export type ApiTarget = (typeof apiTargets)[number];
