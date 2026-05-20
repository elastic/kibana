import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps, MetricVisualizationState } from '@kbn/lens-common';
export type SupportingVisType = 'none' | 'bar' | 'trendline';
export type ApplyColor = 'background' | 'value' | 'none';
export type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
    paletteService: PaletteRegistry;
};
export declare function DimensionEditor(props: VisualizationDimensionEditorProps<MetricVisualizationState>): React.JSX.Element | null;
export declare function DimensionEditorAdditionalSection({ state, datasource, setState, addLayer, removeLayer, accessor, frame, paletteService, panelRef, isInlineEditing, }: Props): React.JSX.Element | null;
export declare function DimensionEditorDataExtraComponent({ groupId, datasource, state, setState, frame, }: Omit<Props, 'paletteService'>): React.JSX.Element | null;
