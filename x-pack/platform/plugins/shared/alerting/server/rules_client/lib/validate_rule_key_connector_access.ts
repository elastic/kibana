/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, SavedObjectReference } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import type { UnusableConnectorErrorData } from '@kbn/actions-plugin/server';
import { getUiamApiKeySecret } from '@kbn/task-manager-plugin/server';

import { invalidateKeys } from '../../application/rule/methods/common_utils/invalidate_keys';
import type { RawRule } from '../../types';
import type { RulesClientContext } from '../types';

export interface ValidateRuleKeyConnectorAccessParams {
  spaceId: string;
  connectorIds: string[];
  /** The rule's Elasticsearch API key as stored on the rule: `base64(id:key)`. */
  apiKey: string | null;
  uiamApiKey?: string | null;
  uiamApiKeyExternal?: boolean | null;
  /** Whether this request minted or cloned the keys, so that they may not be searchable yet. */
  createdInThisRequest: boolean;
}

export type RuleKeySet = Pick<
  RawRule,
  'apiKey' | 'apiKeyCreatedByUser' | 'uiamApiKey' | 'uiamApiKeyExternal'
>;

/**
 * Returns the IDs of the connectors that a rule's stored references point to.
 */
export const getReferencedConnectorIds = (references: SavedObjectReference[] = []): string[] =>
  references.filter(({ type }) => type === 'action').map(({ id }) => id);

/**
 * Throws unless the rule's API keys can use every restricted connector the rule references. Rules
 * that reference only unrestricted connectors cost one read.
 */
export const validateRuleKeyConnectorAccess = async (
  context: RulesClientContext,
  {
    spaceId,
    connectorIds,
    apiKey,
    uiamApiKey,
    uiamApiKeyExternal,
    createdInThisRequest,
  }: ValidateRuleKeyConnectorAccessParams
): Promise<void> => {
  const { accessControl, getActionsClientWithRequest } = context;
  if (!accessControl?.isEnabled() || (!apiKey && !uiamApiKey)) {
    return;
  }

  const actionsClient = await context.getActionsClient();
  const storedConnectorIds = [...new Set(connectorIds)].filter(
    (id) => !context.isSystemAction(id) && !actionsClient.isPreconfigured(id)
  );
  if (storedConnectorIds.length === 0) {
    return;
  }

  const restrictedConnectorIds = await actionsClient.getRestrictedConnectorIds(storedConnectorIds);
  if (restrictedConnectorIds.length === 0) {
    return;
  }

  if (!getActionsClientWithRequest) {
    throw new Error('Rule API keys cannot be validated without an actions client for the key');
  }

  if (apiKey) {
    // A key minted in this request may not be searchable yet. It acts for the caller by
    // construction: a granted key belongs to the caller, and a cloned key copies the caller's own.
    const principal = createdInThisRequest
      ? await accessControl.asScoped(context.request).getPrincipal()
      : undefined;
    const keyActionsClient = await getActionsClientWithRequest(
      createKeyRequest(`ApiKey ${apiKey}`, spaceId)
    );
    await withKeyRefusal(
      keyActionsClient.ensureConnectorsUsable(restrictedConnectorIds, { principal }),
      (connectorId) => `The rule's API key cannot use connector "${connectorId}"`
    );
  }

  if (uiamApiKey) {
    const request = createKeyRequest(`ApiKey ${getUiamApiKeySecret(uiamApiKey)}`, spaceId);
    if (uiamApiKeyExternal) {
      markExternalUiamCredential(request);
    }

    // shortcut: a UIAM API key cannot be matched to the user who created it until
    // https://github.com/elastic/kibana/issues/271760 is resolved, so it only gets general access.
    const keyActionsClient = await getActionsClientWithRequest(request);
    await withKeyRefusal(
      keyActionsClient.ensureConnectorsUsable(restrictedConnectorIds),
      () => `The rule's UIAM API key cannot be matched to a user yet (kibana#271760)`
    );
  }
};

/**
 * Validates a key set this request resolved for a rule and, when validation fails, marks the keys
 * this request created for invalidation, since no rule will ever hold them.
 */
export const validateNewRuleKeyConnectorAccess = async (
  context: RulesClientContext,
  {
    spaceId,
    connectorIds,
    keySet: { apiKey, apiKeyCreatedByUser, uiamApiKey, uiamApiKeyExternal },
  }: { spaceId: string; connectorIds: string[]; keySet: RuleKeySet }
): Promise<void> => {
  try {
    await validateRuleKeyConnectorAccess(context, {
      spaceId,
      connectorIds,
      apiKey,
      uiamApiKey,
      uiamApiKeyExternal,
      createdInThisRequest: !apiKeyCreatedByUser,
    });
  } catch (error) {
    await invalidateKeys(
      [
        {
          apiKey,
          uiamApiKey: uiamApiKey ?? null,
          apiKeyCreatedByUser: apiKeyCreatedByUser ?? null,
        },
      ],
      context
    );
    throw error;
  }
};

const createKeyRequest = (authorization: string, spaceId: string): KibanaRequest =>
  kibanaRequestFactory({ headers: { authorization }, spaceId: brandSpaceId(spaceId) });

/**
 * Replaces the actions plugin's refusal of a connector with one that names the rule's key.
 */
const withKeyRefusal = async (check: Promise<void>, refusal: (connectorId: string) => string) => {
  try {
    await check;
  } catch (error) {
    if (!Boom.isBoom(error)) {
      throw error;
    }

    const { connectorId }: Partial<UnusableConnectorErrorData> = error.data ?? {};
    if (!connectorId) {
      throw error;
    }
    throw Boom.forbidden(refusal(connectorId));
  }
};
