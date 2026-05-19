export type BucketCount = number;
export type BucketTerm = string;
export interface AggregatableField {
    fieldName: string;
    existsInDocs: boolean;
    stats?: {
        sampleCount: number;
        count: number;
        cardinality: number;
    };
    aggregatable?: boolean;
}
