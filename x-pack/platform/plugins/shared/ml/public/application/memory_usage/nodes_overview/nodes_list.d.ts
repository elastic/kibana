import type { FC } from 'react';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { NodeDeploymentStatsResponse } from '@kbn/ml-common-types/trained_models';
export type NodeItem = NodeDeploymentStatsResponse;
export declare const getDefaultNodesListState: () => ListingPageUrlState;
export interface NodesListProps {
    compactView?: boolean;
}
export declare const NodesList: FC<NodesListProps>;
