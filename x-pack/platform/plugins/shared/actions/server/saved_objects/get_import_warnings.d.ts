import type { SavedObject, SavedObjectsImportWarning } from '@kbn/core/server';
import type { InMemoryConnector, RawAction } from '../types';
export declare function getImportWarnings(connectors: Array<SavedObject<RawAction>>): SavedObjectsImportWarning[];
export declare function getPreconfiguredConflictWarnings(connectors: Array<SavedObject<RawAction> & {
    destinationId?: string;
}>, inMemoryConnectors: InMemoryConnector[]): SavedObjectsImportWarning[];
export declare function getConnectorsWithInvalidIds(connectors: Array<SavedObject<RawAction> & {
    destinationId?: string;
}>): (SavedObject<RawAction> & {
    destinationId?: string;
})[];
export declare function getInvalidConnectorIdWarnings(connectors: Array<SavedObject<RawAction> & {
    destinationId?: string;
}>): SavedObjectsImportWarning[];
export declare const GO_TO_CONNECTORS_BUTTON_LABLE: string;
