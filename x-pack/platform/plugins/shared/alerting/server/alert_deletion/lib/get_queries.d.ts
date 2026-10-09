import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SpaceId } from '@kbn/core-spaces-common';
export declare const getActiveAlertsQuery: (threshold: number, spaceId: SpaceId) => QueryDslQueryContainer;
export declare const getInactiveAlertsQuery: (threshold: number, spaceId: SpaceId) => QueryDslQueryContainer;
