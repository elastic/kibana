import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import type { CaseUserActionDeprecatedResponse } from '../../../common/types/api';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
import type { UserActionPersistedAttributes, UserActionSavedObjectTransformed, UserActionTransformedAttributes } from '../../common/types/user_actions';
export declare function transformFindResponseToExternalModel(userActions: SavedObjectsFindResponse<UserActionPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry): SavedObjectsFindResponse<UserActionTransformedAttributes>;
export declare function transformToExternalModel(userAction: SavedObject<UserActionPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry): UserActionSavedObjectTransformed;
/**
 * This function should only be used in the getAll user actions and it is deprecated. It should be removed when the
 * getAll route is removed.
 *
 * @deprecated remove when the getAllRoute is removed
 */
export declare function legacyTransformFindResponseToExternalModel(userActions: SavedObjectsFindResponse<UserActionPersistedAttributes>, persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry): SavedObjectsFindResponse<CaseUserActionDeprecatedResponse>;
