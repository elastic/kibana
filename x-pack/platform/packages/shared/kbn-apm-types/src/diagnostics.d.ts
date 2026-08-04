export interface IndiciesItem {
    index: string;
    fieldMappings: {
        isValid: boolean;
        invalidType?: string;
    };
    ingestPipeline: {
        isValid?: boolean;
        id?: string;
    };
    dataStream?: string;
    isValid: boolean;
}
