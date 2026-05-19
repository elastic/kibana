import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { CaseUserActionDeprecatedResponse, CaseUserActionsDeprecatedResponse } from '../../../common/types/api';
import type { UserActionAttributes, UserActions } from '../../../common/types/domain';
export declare const extractAttributes: (userActions: SavedObjectsFindResponse<CaseUserActionDeprecatedResponse>) => CaseUserActionsDeprecatedResponse;
export declare const formatSavedObjects: (response: SavedObjectsFindResponse<UserActionAttributes>) => UserActions;
