import type { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import type { RawRule } from '../../types';
import type { UiamApiKeyByRuleId } from '../types';
/**
 * Builds the bulk update payload for writing UIAM API keys onto rule saved objects.
 */
export declare const buildRuleUpdatesForUiam: (rulesWithUiamApiKeys: Array<UiamApiKeyByRuleId>) => Array<SavedObjectsBulkUpdateObject<RawRule>>;
