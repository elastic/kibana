import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { CaseUserActionWithoutReferenceIds, AttachmentAttributesWithoutRefs } from '../../../common/types/domain';
export declare function getAttachmentsAndUserActionsForCases(savedObjectsClient: SavedObjectsClientContract, caseIds: string[]): Promise<Array<SavedObject<AttachmentAttributesWithoutRefs | CaseUserActionWithoutReferenceIds>>>;
