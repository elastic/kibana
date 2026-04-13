export declare const previewDocsFilterOptions: {
    readonly outcome_filter_all: {
        readonly id: "outcome_filter_all";
        readonly label: string;
        readonly tooltip: string;
    };
    readonly outcome_filter_parsed: {
        readonly id: "outcome_filter_parsed";
        readonly label: string;
        readonly tooltip: string;
    };
    readonly outcome_filter_partially_parsed: {
        readonly id: "outcome_filter_partially_parsed";
        readonly label: string;
        readonly tooltip: string;
    };
    readonly outcome_filter_skipped: {
        readonly id: "outcome_filter_skipped";
        readonly label: string;
        readonly tooltip: string;
    };
    readonly outcome_filter_failed: {
        readonly id: "outcome_filter_failed";
        readonly label: string;
        readonly tooltip: string;
    };
    readonly outcome_filter_dropped: {
        readonly id: "outcome_filter_dropped";
        readonly label: string;
        readonly tooltip: string;
    };
};
export type PreviewDocsFilterOption = keyof typeof previewDocsFilterOptions;
