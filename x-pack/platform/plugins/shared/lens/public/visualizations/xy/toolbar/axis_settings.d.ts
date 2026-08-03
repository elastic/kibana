import React from 'react';
import type { IconType } from '@elastic/eui';
import type { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import type { ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
import type { AxesSettingsConfigKeys } from '../../../shared_components';
import type { XYLayerConfig } from '../types';
export declare const axisConfig: (axis: AxesSettingsConfigKeys, isHorizontal: boolean) => {
    icon: IconType;
    groupPosition: ToolbarButtonProps<"iconButton">["groupPosition"];
    popoverTitle: string;
    buttonDataTestSubj: string;
};
export interface AxisSettingsProps {
    /**
     * Determines the axis
     */
    axis: AxesSettingsConfigKeys;
    /**
     * Contains the chart layers
     */
    layers?: XYLayerConfig[];
    /**
     * Determines the axis title
     */
    axisTitle: string | undefined;
    /**
     * Callback to axis title change
     */
    updateTitleState: (title: {
        title?: string;
        visible: boolean;
    }, settingId: AxesSettingsConfigKeys) => void;
    /**
     * Determines if the ticklabels of the axis are visible
     */
    areTickLabelsVisible: boolean;
    /**
     * Determines the axis labels orientation
     */
    orientation: number;
    /**
     * Callback on orientation option change
     */
    setOrientation: (axis: AxesSettingsConfigKeys, orientation: number) => void;
    /**
     * Toggles the axis tickLabels visibility
     */
    toggleTickLabelsVisibility: (axis: AxesSettingsConfigKeys) => void;
    /**
     * Determines if the gridlines of the axis are visible
     */
    areGridlinesVisible: boolean;
    /**
     * Toggles the gridlines visibility
     */
    toggleGridlinesVisibility: (axis: AxesSettingsConfigKeys) => void;
    /**
     * Determines if the title visibility switch is on and the input text is disabled
     */
    isTitleVisible: boolean;
    /**
     * Set endzone visibility
     */
    setEndzoneVisibility?: (checked: boolean) => void;
    /**
     * Flag whether endzones are visible
     */
    endzonesVisible?: boolean;
    /**
     * Set current time marker visibility
     */
    setCurrentTimeMarkerVisibility?: (checked: boolean) => void;
    /**
     * Flag whether current time marker is visible
     */
    currentTimeMarkerVisible?: boolean;
    /**
     * Set scale
     */
    setScale?: (scale: YScaleType) => void;
    /**
     * Current scale
     */
    scale?: YScaleType;
    /**
     *  axis extent
     */
    extent?: AxisExtentConfig;
    /**
     * set axis extent
     */
    setExtent?: (extent?: AxisExtentConfig) => void;
    /**
     * Set scale and extent together
     *
     * Note: Must set both together or state does not update correctly
     */
    setScaleWithExtent?: (extent?: AxisExtentConfig, scale?: YScaleType) => void;
    hasBarOrAreaOnAxis: boolean;
    hasPercentageAxis: boolean;
    dataBounds?: {
        min: number;
        max: number;
    };
    /**
     * Toggle the visibility of legacy axis settings when using the new multilayer time axis
     */
    useMultilayerTimeAxis?: boolean;
}
export declare const XyAxisSettings: React.FC<AxisSettingsProps>;
