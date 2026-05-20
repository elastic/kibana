import React from 'react';
import type { Visualization } from '@kbn/lens-common';
import type { ConfigPanelWrapperProps } from './types';
export declare const ConfigPanelWrapper: React.NamedExoticComponent<ConfigPanelWrapperProps>;
export declare function ConfigPanel(props: ConfigPanelWrapperProps & {
    activeVisualization: Visualization;
}): React.JSX.Element | null;
