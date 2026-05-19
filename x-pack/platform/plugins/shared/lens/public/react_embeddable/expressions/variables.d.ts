import type { LensRuntimeState } from '@kbn/lens-common';
import type { LensApi } from '@kbn/lens-common-2';
/**
 * Collect all the data that need to be forwarded at the end of the
 * expression pipeline as overrides, palette, etc... and merged them all here
 */
export declare function getVariables(api: LensApi, state: LensRuntimeState): {
    overrides?: Partial<Record<"chart", {
        description?: string | undefined;
        title?: string | undefined;
    }>> | Partial<Record<"settings", {
        locale?: string | undefined;
        debug?: NonNullable<boolean | undefined> | undefined;
        onResize?: "ignore" | undefined;
        theme?: import("@kbn/charts-plugin/common/static/overrides").MakeOverridesSerializable<import("@elastic/charts").RecursivePartial<import("@elastic/charts").Theme> | import("@elastic/charts").RecursivePartial<import("@elastic/charts").Theme>[] | undefined>;
        ariaLabel?: string | undefined;
        rendering?: NonNullable<import("@elastic/charts").Rendering | undefined> | undefined;
        ariaLabelledBy?: string | undefined;
        dow?: number | undefined;
        ariaDescription?: string | undefined;
        ariaDescribedBy?: string | undefined;
        noResults?: NonNullable<import("react").ReactNode | import("react").ComponentType> | undefined;
        rotation?: NonNullable<import("@elastic/charts").Rotation | undefined> | undefined;
        animateData?: NonNullable<boolean | undefined> | undefined;
        externalPointerEvents?: import("@kbn/charts-plugin/common/static/overrides").MakeOverridesSerializable<import("@elastic/charts").ExternalPointerEventsSettings | undefined>;
        pointBuffer?: NonNullable<import("@elastic/charts").MarkBuffer | undefined> | undefined;
        pointerUpdateTrigger?: NonNullable<import("@elastic/charts").PointerUpdateTrigger | undefined> | undefined;
        brushAxis?: NonNullable<import("@elastic/charts").BrushAxis | undefined> | undefined;
        minBrushDelta?: number | undefined;
        allowBrushingLastHistogramBin?: NonNullable<boolean | undefined> | undefined;
        ariaLabelHeadingLevel?: NonNullable<"h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | undefined> | undefined;
        ariaUseDefaultSummary?: NonNullable<boolean | undefined> | undefined;
        showLegend?: NonNullable<boolean | undefined> | undefined;
        legendPosition?: NonNullable<import("@elastic/charts").Position | import("@elastic/charts").LegendPositionConfig | undefined> | undefined;
        legendValues?: import("@kbn/charts-plugin/common/static/overrides").MakeOverridesSerializable<import("@elastic/charts").LegendValue[] | undefined>;
        legendMaxDepth?: number | undefined;
        legendSize?: number | undefined;
        flatLegend?: NonNullable<boolean | undefined> | undefined;
        legendActionOnHover?: NonNullable<boolean | undefined> | undefined;
        debugState?: NonNullable<boolean | undefined> | undefined;
        onProjectionClick?: "ignore" | undefined;
        onElementClick?: "ignore" | undefined;
        onElementOver?: "ignore" | undefined;
        onElementOut?: "ignore" | undefined;
        onBrushEnd?: "ignore" | undefined;
        onWillRender?: "ignore" | undefined;
        onProjectionAreaChange?: "ignore" | undefined;
        xDomain?: import("@kbn/charts-plugin/common/static/overrides").MakeOverridesSerializable<import("@elastic/charts").CustomXDomain | undefined>;
        onAnnotationClick?: "ignore" | undefined;
        resizeDebounce?: number | undefined;
        pointerUpdateDebounce?: number | undefined;
        roundHistogramBrushValues?: NonNullable<boolean | undefined> | undefined;
        renderingSort?: "ignore" | undefined;
        ariaTableCaption?: string | undefined;
        legendLayout?: NonNullable<import("@elastic/charts").LegendLayout | undefined> | undefined;
        legendStrategy?: NonNullable<import("@elastic/charts").LegendStrategy | undefined> | undefined;
        onLegendItemOver?: "ignore" | undefined;
        onLegendItemOut?: "ignore" | undefined;
        onLegendItemClick?: "ignore" | undefined;
        onLegendItemPlusClick?: "ignore" | undefined;
        onLegendItemMinusClick?: "ignore" | undefined;
        legendAction?: "ignore" | undefined;
        legendSort?: "ignore" | undefined;
        customLegend?: "ignore" | undefined;
        legendTitle?: string | undefined;
    }>> | Partial<Record<"axisX" | "axisLeft" | "axisRight", {
        domain?: import("@kbn/chart-expressions-common").MakeOverridesSerializable<import("@elastic/charts").YDomainRange | undefined>;
        title?: string | undefined;
        position?: NonNullable<import("@elastic/charts").Position | undefined> | undefined;
        style?: import("@kbn/chart-expressions-common").MakeOverridesSerializable<import("@elastic/charts").RecursivePartial<Omit<import("@elastic/charts").AxisStyle, "gridLine">> | undefined>;
        hide?: NonNullable<boolean | undefined> | undefined;
        maximumFractionDigits?: number | undefined;
        ticks?: number | undefined;
        showOverlappingTicks?: NonNullable<boolean | undefined> | undefined;
        showOverlappingLabels?: NonNullable<boolean | undefined> | undefined;
        timeAxisLayerCount?: number | undefined;
        tickFormat?: "ignore" | undefined;
        gridLine?: import("@kbn/chart-expressions-common").MakeOverridesSerializable<Partial<import("@elastic/charts").GridLineStyle> | undefined>;
        labelFormat?: "ignore" | undefined;
        integersOnly?: NonNullable<boolean | undefined> | undefined;
        showDuplicatedTicks?: NonNullable<boolean | undefined> | undefined;
    }>> | Partial<Record<"partition", {
        animation?: import("@kbn/chart-expressions-common").MakeOverridesSerializable<{
            duration: import("@elastic/charts").TimeMs;
        } | undefined>;
        drilldown?: NonNullable<boolean | undefined> | undefined;
        valueGetter?: NonNullable<import("@elastic/charts").ValueGetter | undefined> | undefined;
        fillOutside?: NonNullable<boolean | undefined> | undefined;
        radiusOutside?: number | undefined;
        fillRectangleWidth?: number | undefined;
        fillRectangleHeight?: number | undefined;
        topGroove?: number | undefined;
        percentFormatter?: "ignore" | undefined;
        clockwiseSectors?: NonNullable<boolean | undefined> | undefined;
        maxRowCount?: number | undefined;
        specialFirstInnermostSector?: NonNullable<boolean | undefined> | undefined;
        smallMultiples?: string | undefined;
    }>> | Partial<Record<"gauge", {
        id: string;
        domain: import("@kbn/chart-expressions-common").MakeOverridesSerializable<import("@elastic/charts").GoalDomainRange>;
        target?: number | undefined;
        subtype: NonNullable<import("@elastic/charts/dist/chart_types/goal_chart/specs/constants").GoalSubtype>;
        ticks?: NonNullable<number | number[] | undefined> | undefined;
        bands?: NonNullable<number | number[] | undefined> | undefined;
        base?: number | undefined;
        actual?: number | undefined;
        bandFillColor?: "ignore" | undefined;
        tickValueFormatter?: "ignore" | undefined;
        labelMajor?: NonNullable<string | import("@elastic/charts").GoalLabelAccessor | undefined> | undefined;
        labelMinor?: NonNullable<string | import("@elastic/charts").GoalLabelAccessor | undefined> | undefined;
        centralMajor?: NonNullable<string | import("@elastic/charts").GoalLabelAccessor | undefined> | undefined;
        centralMinor?: NonNullable<string | import("@elastic/charts").GoalLabelAccessor | undefined> | undefined;
        angleStart?: number | undefined;
        angleEnd?: number | undefined;
        bandLabels?: import("@kbn/chart-expressions-common").MakeOverridesSerializable<string[] | undefined>;
        tooltipValueFormatter?: "ignore" | undefined;
    }>> | undefined;
    theme?: {
        palette: import("@kbn/coloring").PaletteOutput<Record<string, unknown>>;
    } | undefined;
    embeddableTitle: string | undefined;
};
