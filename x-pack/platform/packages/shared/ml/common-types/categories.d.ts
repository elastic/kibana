export type CategoryId = number;
export interface Category {
    job_id: string;
    category_id: CategoryId;
    terms: string;
    regex: string;
    max_matching_length: number;
    examples: string[];
    grok_pattern: string;
    partition_field_name?: string;
    partition_field_value?: string;
}
