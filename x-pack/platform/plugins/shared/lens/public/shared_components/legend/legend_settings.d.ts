import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import type { VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { Position, LegendValue } from '@elastic/charts';
import { LegendLayout, type LegendSize, type XYLegendValue } from '@kbn/chart-expressions-common';
import { type ToolbarPopoverProps } from '../toolbar_popover';
export interface LegendSettingsProps<LegendStats extends LegendValue = XYLegendValue> {
    /**
     * Determines the legend display options
     */
    legendOptions: Array<{
        id: string;
        value: 'auto' | 'show' | 'hide' | 'default';
        label: string;
    }>;
    /**
     * Determines the legend mode
     */
    mode: 'default' | 'show' | 'hide' | 'auto';
    /**
     * Callback on display option change
     */
    onDisplayChange: (id: string) => void;
    /**
     * Sets the legend position
     */
    position?: Position;
    /**
     * Callback on position option change
     */
    onPositionChange: (id: string) => void;
    /**
     * Determines the legend location
     */
    location?: 'inside' | 'outside';
    /**
     * Callback on location option change
     */
    onLocationChange?: (id: string) => void;
    /**
     * Sets the vertical alignment for legend inside chart
     */
    verticalAlignment?: typeof VerticalAlignment.Top | typeof VerticalAlignment.Bottom;
    /**
     * Sets the vertical alignment for legend inside chart
     */
    horizontalAlignment?: typeof HorizontalAlignment.Left | typeof HorizontalAlignment.Right;
    /**
     * Callback on horizontal alignment option change
     */
    onAlignmentChange?: (id: string) => void;
    /**
     * Sets the number of columns for legend inside chart
     */
    floatingColumns?: number;
    /**
     * Callback on alignment option change
     */
    onFloatingColumnsChange?: (value: number) => void;
    /**
     * Sets the number of lines per legend item
     */
    maxLines?: number;
    /**
     * Callback on max lines option change
     */
    onMaxLinesChange?: (value: number) => void;
    /**
     * Defines if the legend items will be truncated or not
     */
    shouldTruncate?: boolean;
    /**
     * Callback on nested switch status change
     */
    onTruncateLegendChange?: (event: EuiSwitchEvent) => void;
    /**
     * If true, nested legend switch is rendered
     */
    renderNestedLegendSwitch?: boolean;
    /**
     * nested legend switch status
     */
    nestedLegend?: boolean;
    /**
     * Callback on nested switch status change
     */
    onNestedLegendChange?: (event: EuiSwitchEvent) => void;
    /**
     * current value in legend stats
     */
    legendStats?: LegendStats[];
    /**
     * legend statistics that are allowed
     */
    allowedLegendStats?: Array<{
        label: string;
        value: LegendStats;
        toolTipContent?: string;
    }>;
    /**
     * Callback on value in legend stats change
     */
    onLegendStatsChange?: (legendStats?: LegendStats[], hasConvertedToTable?: boolean) => void;
    /**
     * Button group position
     */
    groupPosition?: ToolbarPopoverProps['groupPosition'];
    /**
     * Legend size in pixels
     */
    legendSize?: LegendSize;
    /**
     * Callback on legend size change
     */
    onLegendSizeChange: (size?: LegendSize) => void;
    /**
     * Legend layout (applies only for horizontal legends - top/bottom)
     */
    layout?: LegendLayout;
    /**
     * Callback on layout change. When called with `undefined`, the default layout behavior is used.
     */
    onLayoutChange?: (layout?: LegendLayout) => void;
    /**
     * Whether to show auto legend size option. Should only be true for pre 8.3 visualizations that already had it as their setting.
     * (We're trying to get people to stop using it so it can eventually be removed.)
     */
    showAutoLegendSizeOption: boolean;
    titlePlaceholder?: string;
    legendTitle?: string;
    isTitleVisible?: boolean;
    onLegendTitleChange?: (state: {
        title?: string;
        visible: boolean;
    }) => void;
}
export declare const MaxLinesInput: ({ value, setValue, disabled, }: {
    value: number;
    setValue: (value: number) => void;
    disabled?: boolean;
}) => React.JSX.Element;
export declare function shouldDisplayTable(legendValues: LegendValue[]): boolean;
export declare function LegendSettingsPopover<LegendStats extends LegendValue = XYLegendValue>(props: LegendSettingsProps<LegendStats>): React.JSX.Element;
export declare function LegendSettings<LegendStats extends LegendValue = XYLegendValue>({ allowedLegendStats, legendOptions, mode, legendTitle, isTitleVisible, onLegendTitleChange, onDisplayChange, position, location, onLocationChange, verticalAlignment, horizontalAlignment, floatingColumns, onAlignmentChange, onFloatingColumnsChange, onPositionChange, renderNestedLegendSwitch, nestedLegend, onNestedLegendChange, legendStats, onLegendStatsChange, maxLines, onMaxLinesChange, shouldTruncate, onTruncateLegendChange, legendSize, onLegendSizeChange, layout, onLayoutChange, showAutoLegendSizeOption, titlePlaceholder, }: LegendSettingsProps<LegendStats>): React.JSX.Element;
