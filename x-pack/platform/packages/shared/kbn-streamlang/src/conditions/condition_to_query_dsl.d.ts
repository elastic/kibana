import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Condition } from '../../types/conditions';
export declare function conditionToQueryDsl(condition: Condition): QueryDslQueryContainer;
