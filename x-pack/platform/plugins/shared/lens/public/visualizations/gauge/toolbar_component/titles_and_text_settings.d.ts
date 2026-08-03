import React from 'react';
import type { GaugeLabelMajorMode } from '@kbn/expression-gauge-plugin/common';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { GaugeVisualizationState } from '../constants';
type Props = VisualizationToolbarProps<GaugeVisualizationState> & {
    inputValue: GaugeVisualizationState;
    handleInputChange: (val: GaugeVisualizationState) => void;
    subtitleMode: GaugeLabelMajorMode;
    setSubtitleMode: React.Dispatch<React.SetStateAction<GaugeLabelMajorMode>>;
};
export declare function TitlesAndTextSettings(props: Props): React.JSX.Element;
export {};
