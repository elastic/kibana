import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc, SavedObjectMigrationMap } from '@kbn/core/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SavedObjectMigrationParams } from '@kbn/core-saved-objects-server';
import type { MarkdownNode } from '../../../common/utils/markdown_plugins/utils';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { AttachmentPersistedAttributes } from '../../common/types/attachments_v1';
export interface CreateCommentsMigrationsDeps {
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}
export declare const createCommentsMigrations: (migrationDeps: CreateCommentsMigrationsDeps) => SavedObjectMigrationMap;
export declare const migrateByValueLensVisualizations: (migrate: MigrateFunction, migrationVersion: string) => SavedObjectMigrationParams<AttachmentPersistedAttributes, AttachmentPersistedAttributes>;
export declare const stringifyCommentWithoutTrailingNewline: (originalComment: string, markdownNode: MarkdownNode) => string;
export declare const removeRuleInformation: (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<unknown>;
export declare const removeAssociationType: (doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>) => SavedObjectSanitizedDoc<Record<string, unknown>>;
