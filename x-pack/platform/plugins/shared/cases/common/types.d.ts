type SnakeToCamelCaseString<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCaseString<U>>}` : S;
type SnakeToCamelCaseArray<T> = T extends Array<infer ArrayItem> ? Array<SnakeToCamelCase<ArrayItem>> : T;
export type SnakeToCamelCase<T> = T extends Record<string, unknown> ? {
    [K in keyof T as SnakeToCamelCaseString<K & string>]: SnakeToCamelCase<T[K]>;
} : T extends unknown[] ? SnakeToCamelCaseArray<T> : T;
export declare enum CASE_VIEW_PAGE_TABS {
    ALERTS = "alerts",
    ACTIVITY = "activity",
    EVENTS = "events",
    FILES = "files",
    OBSERVABLES = "observables",
    SIMILAR_CASES = "similar_cases",
    ATTACHMENTS = "attachments"
}
export {};
