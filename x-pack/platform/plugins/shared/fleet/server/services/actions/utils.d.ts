import type { KueryNode } from '@kbn/es-query';
export declare const isFieldDefined: (indexMappings: FleetActionsIndexMapping | FleetActionsResultsIndexMapping, key: string) => boolean;
export declare const hasFieldKeyError: (key: string | null | undefined, fieldTypes: Readonly<string[]>, indexMapping: FleetActionsIndexMapping | FleetActionsResultsIndexMapping, indexType: IndexType) => string | null;
export declare const ALLOWED_FLEET_ACTIONS_RESULTS_FIELD_TYPES: Readonly<string[]>;
export declare const ALLOWED_FLEET_ACTIONS_FIELD_TYPES: Readonly<string[]>;
export interface FleetActionsIndexMapping {
    properties: {
        action_id: {
            type: 'keyword';
        };
        agents: {
            type: 'keyword';
        };
        input_type: {
            type: 'keyword';
        };
        '@timestamp': {
            type: 'date';
        };
        type: {
            type: 'keyword';
        };
        user_id: {
            type: 'keyword';
        };
    };
}
export interface FleetActionsResultsIndexMapping {
    properties: {
        action_id: {
            type: 'keyword';
        };
        agent_id: {
            type: 'keyword';
        };
    };
}
export declare const allowedFleetActionsFields: FleetActionsIndexMapping;
export declare const allowedFleetActionsResultsFields: FleetActionsResultsIndexMapping;
interface ValidateFilterKueryNode {
    astPath: string;
    error: string;
    isSavedObjectAttr: boolean;
    key: string;
    type: string | null;
}
export type IndexType = 'actions' | 'results';
interface ValidateFilterKueryNodeParams {
    astFilter: KueryNode;
    types: Readonly<string[]>;
    indexMapping: FleetActionsIndexMapping;
    indexType?: IndexType;
    path?: string;
}
export declare const validateFilterKueryNode: ({ astFilter, types, indexMapping, indexType, path, }: ValidateFilterKueryNodeParams) => ValidateFilterKueryNode[];
export {};
