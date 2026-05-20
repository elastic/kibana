import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import type { SanitizedCaseOwner } from '.';
export interface UnsanitizedConfigureConnector {
    connector_id: string;
    connector_name: string;
}
interface SanitizedConfigureConnector {
    connector: {
        id: string;
        name: string | null;
        type: string | null;
        fields: null;
    };
}
export declare const createConnectorAttributeMigration: (doc: SavedObjectUnsanitizedDoc<UnsanitizedConfigureConnector>) => SavedObjectSanitizedDoc<SanitizedConfigureConnector>;
export declare const configureConnectorIdMigration: (doc: SavedObjectUnsanitizedDoc<{
    connector?: {
        id: string;
    };
}>) => SavedObjectSanitizedDoc<unknown>;
export declare const configureMigrations: {
    '7.10.0': (doc: SavedObjectUnsanitizedDoc<UnsanitizedConfigureConnector>) => SavedObjectSanitizedDoc<SanitizedConfigureConnector>;
    '7.14.0': (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<SanitizedCaseOwner>;
    '7.15.0': (doc: SavedObjectUnsanitizedDoc<{
        connector?: {
            id: string;
        };
    }>) => SavedObjectSanitizedDoc<unknown>;
};
export {};
