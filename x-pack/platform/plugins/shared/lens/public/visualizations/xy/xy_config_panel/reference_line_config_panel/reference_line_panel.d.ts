import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import type { XYVisualizationState, YConfig } from '../../types';
import type { FormatFactory } from '../../../../../common/types';
export declare const ReferenceLinePanel: (props: VisualizationDimensionEditorProps<XYVisualizationState> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
}) => React.JSX.Element;
export declare const FillSetting: ({ currentConfig, setConfig, isHorizontal, }: {
    currentConfig?: YConfig;
    setConfig: (yConfig: Partial<YConfig> | undefined) => void;
    isHorizontal: boolean;
}) => React.JSX.Element;
