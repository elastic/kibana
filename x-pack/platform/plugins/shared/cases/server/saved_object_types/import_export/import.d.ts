import type { SavedObject, SavedObjectsImportHookResult } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
export declare function handleImport({ objects, }: {
    objects: Array<SavedObject<CasePersistedAttributes>>;
}): SavedObjectsImportHookResult;
