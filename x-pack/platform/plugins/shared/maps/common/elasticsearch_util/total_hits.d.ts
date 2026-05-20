export interface TotalHits {
    value: number;
    relation: 'eq' | 'gte';
}
export declare function isTotalHitsGreaterThan(totalHits: TotalHits, value: number): boolean;
