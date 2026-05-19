import type { CaseConnector, ConnectorTypeFields } from '../../../common/types/domain';
import type { ConnectorMappingSource, ConnectorMappingActionType, ConnectorMappingTarget, CaseConnectorMapping } from '../../containers/configure/types';
import type { CaseActionConnector } from '../types';
export declare const setActionTypeToMapping: (caseField: ConnectorMappingSource, newActionType: ConnectorMappingActionType, mapping: CaseConnectorMapping[]) => CaseConnectorMapping[];
export declare const setThirdPartyToMapping: (caseField: ConnectorMappingSource, newThirdPartyField: ConnectorMappingTarget, mapping: CaseConnectorMapping[]) => CaseConnectorMapping[];
export declare const normalizeActionConnector: (actionConnector: CaseActionConnector, fields?: ConnectorTypeFields["fields"]) => CaseConnector;
export declare const normalizeCaseConnector: (connectors: CaseActionConnector[], caseConnector: CaseConnector) => CaseActionConnector | null;
