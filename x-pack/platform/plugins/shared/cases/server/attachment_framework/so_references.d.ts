import type { SavedObjectReference } from '@kbn/core/server';
import type { AttachmentRequest, AttachmentRequestV2 } from '../../common/types/api';
import type { PersistableStateAttachmentPayload } from '../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';
interface SavedObjectAttributesAndReferences {
    state: PersistableStateAttachmentPayload;
    references: SavedObjectReference[];
}
interface ExtractDeps {
    persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}
type InjectDeps = ExtractDeps;
export declare function extractPersistableStateReferences(state: PersistableStateAttachmentPayload, deps: ExtractDeps): SavedObjectAttributesAndReferences;
export declare function injectPersistableReferences({ state, references }: SavedObjectAttributesAndReferences, deps: InjectDeps): PersistableStateAttachmentPayload;
export declare const extractPersistableStateReferencesFromSO: <T extends AttachmentRequestV2>(attachmentAttributes: T, deps: ExtractDeps) => {
    attributes: T;
    references: SavedObjectReference[];
};
export declare const injectPersistableReferencesToSO: <T extends Partial<AttachmentRequest>>(attachmentAttributes: T, references: SavedObjectReference[], deps: InjectDeps) => T;
export {};
