import type { ClosureType, ActionConnector, ActionTypeConnector, CaseConnector, ConnectorMappingTarget, ConnectorMappingSource, ConnectorMappingActionType, CustomFieldsConfiguration } from '../../../common/types/domain';
export type { ActionConnector, ActionTypeConnector, CaseConnector, ConnectorMappingActionType, ConnectorMappingSource, ConnectorMappingTarget, ClosureType, CustomFieldsConfiguration, };
export interface CaseConnectorMapping {
    actionType: ConnectorMappingActionType;
    source: ConnectorMappingSource;
    target: string;
}
