import type { RawRule } from '../../types';
import type { CreateAPIKeyResult } from '../types';
import type { RuleDomain } from '../../application/rule/types';
import { ApiKeyType } from '../../task_runner/types';
/**
 * Stale API key attributes to remove from a rule's stored attributes before spreading in a newly
 * created key set. `getApiKeyRuleProperties` omits the UIAM attributes when no UIAM key was
 * minted, so without this the old values would survive the spread.
 *
 * Callers must persist the result as a whole document (`create` with `overwrite: true`, or
 * `bulkCreate`). In a partial saved-object update attributes are merged, so a stripped attribute
 * is merely absent from the payload and keeps its stored value instead of being removed.
 */
export declare const API_KEY_ATTRIBUTES_TO_STRIP: readonly ['apiKey', 'apiKeyOwner', 'apiKeyOwnerProfileUid', 'apiKeyCreatedByUser', 'uiamApiKey', 'uiamApiKeyExternal'];
/**
 * @deprecated TODO (http-versioning) make sure this is deprecated
 * once all of the RawRules are phased out
 */
export declare function apiKeyAsAlertAttributes(apiKey: CreateAPIKeyResult | null, username: string | null, createdByUser: boolean, profileUid: string | null): Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyOwnerProfileUid' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'>;
export declare function apiKeyAsRuleDomainProperties(apiKey: CreateAPIKeyResult | null, username: string | null, createdByUser: boolean, profileUid: string | null): Pick<RuleDomain, 'apiKey' | 'apiKeyOwner' | 'apiKeyOwnerProfileUid' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'>;
/** Reconciles the translated current and legacy missing UIAM API key tags. */
export declare function updateMissingUiamKeyTag(tags: string[], uiamApiKey: string | null | undefined, isServerless: boolean, shouldGrantUiam: boolean | undefined, apiKeyType: ApiKeyType | undefined): string[];
