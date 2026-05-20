import type { ActionRefIdsAgg, InMemoryAggRes, ConnectorAggRes, ByActionTypeIdAgg } from '../actions_telemetry';
export declare function getInMemoryActions(aggregation?: ActionRefIdsAgg[]): {
    preconfiguredActionsAggs: InMemoryAggRes;
    systemActionsAggs: InMemoryAggRes;
};
export declare function getActions(aggregation?: ActionRefIdsAgg[]): {
    total: number;
    connectorIds: Record<string, string>;
};
export declare function getActionExecutions(aggregation?: ByActionTypeIdAgg[]): ConnectorAggRes;
export declare function getActionsCount(aggregation?: ByActionTypeIdAgg[]): Record<string, number>;
