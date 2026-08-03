import React from 'react';
import type { AxesSettingsConfig, FramePublicAPI, VisualizationToolbarProps, XYVisualizationState } from '@kbn/lens-common';
import type { AxisGroupConfiguration } from '../axes_configuration';
export declare const getDataBounds: (activeData: FramePublicAPI["activeData"], axes: AxisGroupConfiguration[]) => Partial<Record<string, {
    min: number;
    max: number;
}>>;
export declare function hasPercentageAxis(axisGroups: AxisGroupConfiguration[], groupId: string, state: XYVisualizationState): boolean;
export declare const axisKeyToTitleMapping: Record<keyof AxesSettingsConfig, 'xTitle' | 'yTitle' | 'yRightTitle'>;
type Props = VisualizationToolbarProps<XYVisualizationState>;
export declare const XyStyleSettings: React.FC<Props>;
export {};
