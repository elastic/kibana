import React from 'react';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { HeatmapVisualizationState } from '../types';
export declare function HeatmapStyleSettings(props: VisualizationToolbarProps<HeatmapVisualizationState>): React.JSX.Element;
export declare function HeatmapTitlesAndTextSettings({ state, setState, }: VisualizationToolbarProps<HeatmapVisualizationState>): React.JSX.Element;
export declare function HeatmapVerticalAxisSettings({ state, setState, }: VisualizationToolbarProps<HeatmapVisualizationState>): React.JSX.Element;
export declare function HeatmapHorizontalAxisSettings({ state, setState, frame, }: VisualizationToolbarProps<HeatmapVisualizationState>): React.JSX.Element;
