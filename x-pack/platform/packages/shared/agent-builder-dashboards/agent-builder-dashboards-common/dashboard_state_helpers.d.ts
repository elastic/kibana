export declare const DEFAULT_TIME_RANGE: {
    readonly from: "now-24h";
    readonly to: "now";
};
/**
 * Default values for all dashboard state fields except project_routing.
 */
export declare const EMPTY_DASHBOARD_STATE: Readonly<{
    title: "";
    description: "";
    panels: never[];
    time_range: {
        readonly from: "now-24h";
        readonly to: "now";
    };
    query: {
        expression: string;
        language: "kql";
    };
    filters: never[];
    options: {
        hide_panel_titles: boolean;
        hide_panel_borders: boolean;
        use_margins: boolean;
        auto_apply_filters: boolean;
        sync_colors: boolean;
        sync_cursor: boolean;
        sync_tooltips: boolean;
    };
    pinned_panels: never[];
    refresh_interval: {
        pause: boolean;
        value: number;
    };
    tags: never[];
    access_control: {};
}>;
