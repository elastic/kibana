export interface DocumentAnalysisField {
    name: string;
    types: string[];
    cardinality: number | null;
    values: Array<{
        value: string | number | boolean;
        count: number;
    }>;
    empty: boolean;
    documentsWithValue: number;
}
export interface DocumentAnalysis {
    total: number;
    sampled: number;
    fields: DocumentAnalysisField[];
}
export interface FormattedDocumentAnalysis {
    total: number;
    sampled: number;
    fields: Record<string, string[]>;
}
