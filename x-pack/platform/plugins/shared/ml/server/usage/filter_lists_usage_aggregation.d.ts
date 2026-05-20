export interface MlFilterListsUsage {
    total_filter_list_count: number;
    total_filter_item_count: number;
    avg_items_per_filter_list: number;
    empty_filter_list_count: number;
    filter_lists_used_in_rules_count: number;
}
export declare const emptyFilterListsUsage: () => MlFilterListsUsage;
export declare function aggregateFilterListsUsage(filters: ReadonlyArray<{
    filter_id: string;
    items: ReadonlyArray<string>;
}>, jobs: ReadonlyArray<{
    analysis_config?: {
        detectors?: ReadonlyArray<{
            custom_rules?: ReadonlyArray<{
                scope?: Readonly<Record<string, {
                    filter_id?: string;
                } | undefined>>;
            }>;
        }>;
    };
}>): MlFilterListsUsage;
