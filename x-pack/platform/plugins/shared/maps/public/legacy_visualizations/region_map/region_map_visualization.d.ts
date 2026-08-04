import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import type { RegionMapVisConfig } from './types';
interface Props {
    filters?: Filter[];
    query?: Query;
    timeRange?: TimeRange;
    visConfig: RegionMapVisConfig;
    onInitialRenderComplete: () => void;
}
export declare function RegionMapVisualization(props: Props): React.JSX.Element;
export {};
