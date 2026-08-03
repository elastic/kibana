export declare const LENS_HEATMAP_RENDERER = "lens_heatmap_renderer";
export declare const LENS_HEATMAP_ID = "lnsHeatmap";
export declare const DEFAULT_PALETTE_NAME = "temperature";
export declare const CHART_SHAPES: {
    readonly HEATMAP: "heatmap";
};
export declare const CHART_NAMES: {
    heatmap: {
        shapeType: "heatmap";
        icon: (props: Omit<import("@elastic/eui/src/components/icon/icon").EuiIconProps, "type">) => import("react").JSX.Element;
        label: string;
    };
};
export declare const GROUP_ID: {
    readonly X: "x";
    readonly Y: "y";
    readonly CELL: "cell";
};
export declare const FUNCTION_NAME = "heatmap";
export declare const LEGEND_FUNCTION = "heatmap_legend";
export declare const HEATMAP_GRID_FUNCTION = "heatmap_grid";
