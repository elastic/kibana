import type { SavedObjectMigrationContext, SavedObjectReference, SavedObjectSanitizedDoc, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { CaseConnector } from '../../../../common/types/domain';
import { CONNECTOR_ID_REFERENCE_NAME, PUSH_CONNECTOR_ID_REFERENCE_NAME } from '../../../common/constants';
import type { UserActionVersion800 } from './types';
import { USER_ACTION_OLD_ID_REF_NAME, USER_ACTION_OLD_PUSH_ID_REF_NAME } from './constants';
export declare function isCreateConnector(action?: string, actionFields?: string[]): boolean;
export declare function isUpdateConnector(action?: string, actionFields?: string[]): boolean;
export declare function isPush(action?: string, actionFields?: string[]): boolean;
/**
 * Indicates whether which user action field is being parsed, the new_value or the old_value.
 */
export declare enum UserActionFieldType {
    New = "New",
    Old = "Old"
}
/**
 * Extracts the connector id from a json encoded string and formats it as a saved object reference. This will remove
 * the field it extracted the connector id from.
 */
export declare function extractConnectorIdFromJson({ action, actionFields, actionDetails, fieldType, }: {
    action?: string;
    actionFields?: string[];
    actionDetails?: string | null;
    fieldType: UserActionFieldType;
}): {
    transformedActionDetails?: string | null;
    references: SavedObjectReference[];
};
/**
 * Internal helper function for extracting the connector id. This is only exported for usage in unit tests.
 * This function handles encoding the transformed fields as a json string
 */
export declare function extractConnectorIdHelper({ action, actionFields, actionDetails, fieldType, }: {
    action: string;
    actionFields: string[];
    actionDetails: unknown;
    fieldType: UserActionFieldType;
}): {
    transformedActionDetails: string;
    references: SavedObjectReference[];
};
export declare function isCreateCaseConnector(action: string, actionFields: string[], actionDetails: unknown): actionDetails is {
    connector: CaseConnector;
};
export declare const ConnectorIdReferenceName: Record<UserActionFieldType, ConnectorIdRefNameType>;
export declare function transformConnectorFromCreateAndUpdateAction(connector: CaseConnector, fieldType: UserActionFieldType): {
    transformedActionDetails: {
        connector: unknown;
    };
    references: SavedObjectReference[];
};
type ConnectorIdRefNameType = typeof CONNECTOR_ID_REFERENCE_NAME | typeof USER_ACTION_OLD_ID_REF_NAME;
export declare const transformConnectorIdToReference: (referenceName: ConnectorIdRefNameType, connector?: {
    id?: string;
}) => {
    transformedConnector: {
        connector: unknown;
    };
    references: SavedObjectReference[];
};
export declare const PushConnectorIdReferenceName: Record<UserActionFieldType, PushConnectorIdRefNameType>;
type PushConnectorIdRefNameType = typeof PUSH_CONNECTOR_ID_REFERENCE_NAME | typeof USER_ACTION_OLD_PUSH_ID_REF_NAME;
export declare const transformPushConnectorIdToReference: (referenceName: PushConnectorIdRefNameType, external_service?: {
    connector_id?: string | null;
} | null) => {
    transformedPushConnector: {
        external_service: {} | null;
    };
    references: SavedObjectReference[];
};
export declare function isConnectorUserAction(action?: string, actionFields?: string[]): boolean;
export declare function formatDocumentWithConnectorReferences(doc: SavedObjectUnsanitizedDoc<UserActionVersion800>): SavedObjectSanitizedDoc<unknown>;
export declare function userActionsConnectorIdMigration(doc: SavedObjectUnsanitizedDoc<UserActionVersion800>, context: SavedObjectMigrationContext): SavedObjectSanitizedDoc<unknown>;
export {};
