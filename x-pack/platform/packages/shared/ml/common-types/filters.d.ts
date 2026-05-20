export interface Filter {
    filter_id: string;
    description?: string;
    items: string[];
}
interface FilterUsage {
    jobs: string[];
    detectors: string[];
}
export interface FilterStats {
    filter_id: string;
    description?: string;
    item_count: number;
    used_by?: FilterUsage;
}
export {};
