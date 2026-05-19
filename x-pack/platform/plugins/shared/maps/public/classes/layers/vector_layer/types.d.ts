import type { InnerJoin } from '../../joins/inner_join';
import type { PropertiesMap } from '../../../../common/elasticsearch_util';
export interface JoinState {
    dataHasChanged: boolean;
    join: InnerJoin;
    joinIndex: number;
    joinMetrics?: PropertiesMap;
}
