import type { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '@kbn/core/server';
import type { CreateCaseUserAction } from '../../../../common/types/domain';
export declare const addSeverityToCreateUserAction: (doc: SavedObjectUnsanitizedDoc<CreateCaseUserAction>) => SavedObjectSanitizedDoc<CreateCaseUserAction>;
