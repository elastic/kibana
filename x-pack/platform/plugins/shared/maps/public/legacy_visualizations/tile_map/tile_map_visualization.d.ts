import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { TileMapVisConfig } from './types';
interface Props {
    filters?: Filter[];
    query?: Query;
    timeRange?: TimeRange;
    visConfig: TileMapVisConfig;
    onInitialRenderComplete: () => void;
}
export declare function TileMapVisualization(props: Props): React.JSX.Element;
export {};
