import type { CoreSetup, Logger, SavedObject, SavedObjectsExportTransformContext } from '@kbn/core/server';
import type { CaseUserActionWithoutReferenceIds, AttachmentAttributesWithoutRefs } from '../../../common/types/domain';
import type { CasePersistedAttributes } from '../../common/types/case';
export declare function handleExport({ context, objects, coreSetup, logger, }: {
    context: SavedObjectsExportTransformContext;
    objects: Array<SavedObject<CasePersistedAttributes>>;
    coreSetup: CoreSetup;
    logger: Logger;
}): Promise<Array<SavedObject<CasePersistedAttributes | AttachmentAttributesWithoutRefs | CaseUserActionWithoutReferenceIds>>>;
