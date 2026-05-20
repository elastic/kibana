import type { SavedObjectReference } from '@kbn/core/server';
import type { CaseConnector } from '../../common/types/domain';
import type { ConnectorPersistedFields, ConnectorPersisted } from '../common/types/connectors';
export declare function findConnectorIdReference(name: string, references?: SavedObjectReference[]): SavedObjectReference | undefined;
export declare function transformESConnectorToExternalModel({ connector, references, referenceName, }: {
    connector?: ConnectorPersisted;
    references?: SavedObjectReference[];
    referenceName: string;
}): CaseConnector | undefined;
export declare function transformESConnectorOrUseDefault({ connector, references, referenceName, }: {
    connector?: ConnectorPersisted;
    references?: SavedObjectReference[];
    referenceName: string;
}): CaseConnector;
export declare function transformFieldsToESModel(connector: CaseConnector): ConnectorPersistedFields;
