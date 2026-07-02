import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { RawAction } from '../../../types';
export type FindConnectorsSoResult = SavedObjectsFindResponse<RawAction>;
