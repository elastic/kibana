/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { FakeRawRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { InvalidateAPIKeyResult, SecurityServiceStart } from '@kbn/core-security-server';
import { decodeApiKeyId, isUiamCredential } from '@kbn/core-security-server';

import { connectorEventIdentityApiKeyName, type ConnectorEventIdentity } from './types';

const UIAM_LOGS_INVALIDATE_TAGS = ['uiam', 'uiam-api-key-invalidate'];

export const invalidateConnectorEventIdentity = async ({
  identity,
  securityService,
  logger,
  connectorId,
}: {
  identity: ConnectorEventIdentity;
  securityService: SecurityServiceStart;
  logger: Logger;
  connectorId: string;
}): Promise<void> => {
  const name = connectorEventIdentityApiKeyName(connectorId);
  const esApiKeyId = identity.apiKey ? decodeApiKeyId(identity.apiKey) : undefined;
  const tasks: Array<Promise<unknown>> = [];

  if (identity.uiamApiKey) {
    const [uiamApiKeyId, uiamApiKeyValue] = Buffer.from(identity.uiamApiKey, 'base64')
      .toString()
      .split(':');

    if (uiamApiKeyId && uiamApiKeyValue && isUiamCredential(uiamApiKeyValue)) {
      tasks.push(
        (async () => {
          try {
            const fakeRawRequest: FakeRawRequest = {
              headers: { authorization: `ApiKey ${uiamApiKeyValue}` },
              path: '/',
            };
            const fakeRequest = kibanaRequestFactory(fakeRawRequest);
            const result = await securityService.authc.apiKeys.uiam?.invalidate(fakeRequest, {
              id: uiamApiKeyId,
            });
            if (result && result.error_count > 0) {
              logger.error(
                `Failed to invalidate UIAM API key for connector event identity "${name}": ${result.error_details
                  ?.map((error) => error.reason)
                  .join(', ')}`,
                { tags: UIAM_LOGS_INVALIDATE_TAGS }
              );
            }
          } catch (err) {
            logger.error(
              `Failed to invalidate UIAM API key for connector event identity "${name}": ${
                err instanceof Error ? err.message : String(err)
              }`,
              {
                tags: UIAM_LOGS_INVALIDATE_TAGS,
                error: { stack_trace: err instanceof Error ? err.stack : undefined },
              }
            );
          }
        })()
      );
    } else {
      logger.error(
        `Failed to invalidate UIAM API key for connector event identity "${name}": stored credential is not a UIAM API key`,
        { tags: UIAM_LOGS_INVALIDATE_TAGS }
      );
    }
  }

  if (esApiKeyId) {
    tasks.push(
      (async () => {
        try {
          const result: InvalidateAPIKeyResult | null =
            await securityService.authc.apiKeys.invalidateAsInternalUser({
              ids: [esApiKeyId],
            });
          if (result && result.error_count > 0) {
            logger.error(
              `Failed to invalidate ES API key for connector event identity "${name}": ${result.error_details
                ?.map((error) => error.reason)
                .join(', ')}`
            );
          }
        } catch (err) {
          logger.error(
            `Failed to invalidate ES API key for connector event identity "${name}": ${
              err instanceof Error ? err.message : String(err)
            }`,
            { error: { stack_trace: err instanceof Error ? err.stack : undefined } }
          );
        }
      })()
    );
  }

  await Promise.all(tasks);
};
