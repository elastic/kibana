export declare const DEFAULT_LAST_OCCURRED_AT = "--";
interface OccurrencePoint {
    x: number;
    y: number;
}
export declare function formatLastOccurredAt(occurrences: OccurrencePoint[], fallbackValue?: string): string;
export {};
