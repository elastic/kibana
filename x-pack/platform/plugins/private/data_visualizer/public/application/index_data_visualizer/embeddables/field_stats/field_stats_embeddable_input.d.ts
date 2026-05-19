import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';
import type { FieldStatisticsTableEmbeddableState, FieldStatsInitialState } from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';
export declare function EmbeddableFieldStatsUserInput({ coreStart, pluginStart, isNewPanel, initialState, fieldStatsControlsApi, closeFlyout, onUpdate, }: {
    coreStart: CoreStart;
    pluginStart: DataVisualizerStartDependencies;
    isNewPanel: boolean;
    initialState?: FieldStatisticsTableEmbeddableState;
    fieldStatsControlsApi?: FieldStatsControlsApi;
    closeFlyout: () => void;
    onUpdate: (newUpdate: FieldStatsInitialState) => void;
}): React.JSX.Element;
