/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { encodeApiKey } from './encode_api_key';
import { invalidateConnectorEventIdentity } from './invalidate_connector_event_identity';
import { mintConnectorEventIdentity } from './mint_editor_api_keys';
import { connectorEventIdentityApiKeyName } from './types';

const connectorId = 'connector-1';
const name = connectorEventIdentityApiKeyName(connectorId);
const ES_GRANT = { id: 'es-id', name, api_key: 'es-secret' };
const UIAM_GRANT = { id: 'uiam-id', name: `uiam-${name}`, api_key: 'essu_granted' };
const UNSUPPORTED =
  'Cannot use a Cloud API key to save this inbound connector. Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.';

const setup = ({
  uiam = true,
  authenticationType = 'token',
  authorization,
}: {
  uiam?: boolean;
  authenticationType?: string | null;
  authorization?: string;
} = {}) => {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const securityService = securityServiceMock.createStart();
  if (!uiam) {
    (securityService.authc.apiKeys as { uiam?: unknown }).uiam = undefined;
  }
  securityService.authc.getCurrentUser.mockReturnValue(
    (authenticationType === null ? {} : { authentication_type: authenticationType }) as never
  );
  securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANT);
  securityService.authc.apiKeys.uiam?.grant.mockResolvedValue(UIAM_GRANT);
  const request = httpServerMock.createKibanaRequest({
    headers: authorization ? { authorization } : {},
  });
  const mint = () => mintConnectorEventIdentity({ request, securityService, logger, connectorId });
  return { logger, securityService, request, mint };
};

describe('connector event identity API keys characterization', () => {
  describe('mintConnectorEventIdentity grant path', () => {
    it('logs a missing UIAM credential at error and grants only an ES key', async () => {
      const { mint, logger, securityService } = setup({ authorization: 'Basic abc' });

      await expect(mint()).resolves.toEqual({ apiKey: encodeApiKey('es-id', 'es-secret') });
      expect(securityService.authc.apiKeys.uiam!.grant).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for connector event identity "${name}": Invalid or missing UIAM credentials`,
        { tags: ['uiam', 'credentials'] }
      );
    });

    it('logs a failed UIAM grant and still grants the ES key', async () => {
      const { mint, logger, securityService } = setup({ authorization: 'ApiKey essu_session' });
      securityService.authc.apiKeys.uiam!.grant.mockRejectedValue(new Error('uiam down'));

      await expect(mint()).resolves.toEqual({ apiKey: encodeApiKey('es-id', 'es-secret') });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for connector event identity "${name}": uiam down`,
        expect.objectContaining({ tags: ['uiam', 'uiam-api-key-grant'] })
      );
    });

    it('treats a null UIAM grant as a failure and still grants the ES key', async () => {
      const { mint, logger, securityService } = setup({ authorization: 'ApiKey essu_session' });
      securityService.authc.apiKeys.uiam!.grant.mockResolvedValue(null);

      await expect(mint()).resolves.toEqual({ apiKey: encodeApiKey('es-id', 'es-secret') });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for connector event identity "${name}": Failed to create UIAM API key for connector event identity "${name}"`,
        expect.objectContaining({ tags: ['uiam', 'uiam-api-key-grant'] })
      );
    });

    it('rolls back the UIAM key and throws the disabled error when the ES grant returns null', async () => {
      const { mint, securityService, request } = setup({ authorization: 'ApiKey essu_session' });
      securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue(null);

      await expect(mint()).rejects.toThrow(
        'Unable to store connector event identity because API keys are disabled.'
      );
      expect(securityService.authc.apiKeys.uiam!.invalidate).toHaveBeenCalledWith(request, {
        id: 'uiam-id',
      });
    });

    it('logs a rollback that reports errors and rethrows the ES error', async () => {
      const { mint, logger, securityService } = setup({ authorization: 'ApiKey essu_session' });
      securityService.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));
      securityService.authc.apiKeys.uiam!.invalidate.mockResolvedValue({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'x', reason: 'nope' }],
      });

      await expect(mint()).rejects.toThrow('es down');
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate UIAM API key for connector event identity "${name}": nope`,
        { tags: ['uiam', 'uiam-api-key-invalidate'] }
      );
    });

    it('replaces the ES error with the rollback error when the rollback throws (current behavior)', async () => {
      const { mint, securityService } = setup({ authorization: 'ApiKey essu_session' });
      securityService.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));
      securityService.authc.apiKeys.uiam!.invalidate.mockRejectedValue(new Error('rollback down'));

      await expect(mint()).rejects.toThrow('rollback down');
    });
  });

  describe('mintConnectorEventIdentity clone path', () => {
    it('detects API key auth from the header scheme when the user has no authentication type', async () => {
      const { mint, securityService } = setup({
        authenticationType: null,
        authorization: `ApiKey ${encodeApiKey('caller-id', 'caller-secret')}`,
      });
      securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue({
        ...ES_GRANT,
        encoded: 'unused',
      });

      await expect(mint()).resolves.toEqual({ apiKey: encodeApiKey('es-id', 'es-secret') });
      expect(securityService.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('grants a UIAM key instead of cloning a raw UIAM credential', async () => {
      const { mint, securityService } = setup({
        authenticationType: 'api_key',
        authorization: 'ApiKey essu_caller',
      });

      await expect(mint()).resolves.toEqual({
        uiamApiKey: encodeApiKey('uiam-id', 'essu_granted'),
        uiamApiKeyExternal: false,
      });
      expect(securityService.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    });

    it('throws the unsupported error when the UIAM grant for a UIAM caller fails', async () => {
      const { mint, securityService } = setup({
        authenticationType: 'api_key',
        authorization: 'ApiKey essu_caller',
      });
      securityService.authc.apiKeys.uiam!.grant.mockRejectedValue(new Error('uiam down'));

      await expect(mint()).rejects.toThrow(UNSUPPORTED);
    });

    it('clones a base64(id:essu_) caller credential through Elasticsearch', async () => {
      const { mint, securityService } = setup({
        uiam: false,
        authenticationType: 'api_key',
        authorization: `ApiKey ${encodeApiKey('caller-id', 'essu_caller')}`,
      });
      securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue({
        ...ES_GRANT,
        encoded: 'unused',
      });

      await expect(mint()).resolves.toEqual({ apiKey: encodeApiKey('es-id', 'es-secret') });
    });

    it('throws when the clone returns null', async () => {
      const { mint, securityService } = setup({
        authenticationType: 'api_key',
        authorization: `ApiKey ${encodeApiKey('caller-id', 'caller-secret')}`,
      });
      securityService.authc.apiKeys.cloneAsInternalUser.mockResolvedValue(null);

      await expect(mint()).rejects.toThrow(
        'API key clone returned null (security feature may be disabled)'
      );
    });
  });

  it('throws the unsupported error for a UIAM service account when UIAM is disabled', async () => {
    const { mint, securityService } = setup({
      uiam: false,
      authorization: 'Bearer essu_service_account',
    });
    securityService.authc.getPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'sa-id',
      variant: 'uiam',
    });

    await expect(mint()).rejects.toThrow(UNSUPPORTED);
    expect(securityService.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
  });

  describe('invalidateConnectorEventIdentity', () => {
    const invalidate = (
      securityService: ReturnType<typeof securityServiceMock.createStart>,
      logger: jest.Mocked<Logger>,
      identity: { apiKey?: string; uiamApiKey?: string }
    ) => invalidateConnectorEventIdentity({ identity, securityService, logger, connectorId });

    it('logs and skips a stored UIAM value that is not a framework UIAM key', async () => {
      const { securityService, logger } = setup();

      await invalidate(securityService, logger, { uiamApiKey: 'essu_raw' });

      expect(securityService.authc.apiKeys.uiam!.invalidate).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate UIAM API key for connector event identity "${name}": stored credential is not a UIAM API key`,
        { tags: ['uiam', 'uiam-api-key-invalidate'] }
      );
    });

    it('logs a UIAM invalidation that throws', async () => {
      const { securityService, logger } = setup();
      securityService.authc.apiKeys.uiam!.invalidate.mockRejectedValue(new Error('uiam down'));

      await invalidate(securityService, logger, {
        uiamApiKey: encodeApiKey('uiam-id', 'essu_granted'),
      });

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate UIAM API key for connector event identity "${name}": uiam down`,
        expect.objectContaining({ tags: ['uiam', 'uiam-api-key-invalidate'] })
      );
    });

    it('logs an ES invalidation that reports errors, without tags', async () => {
      const { securityService, logger } = setup();
      securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'x', reason: 'nope' }],
      });

      await invalidate(securityService, logger, { apiKey: encodeApiKey('es-id', 'es-secret') });

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate ES API key for connector event identity "${name}": nope`
      );
    });

    it('does nothing more when Elasticsearch does not find the key', async () => {
      const { securityService, logger } = setup();
      securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      await invalidate(securityService, logger, { apiKey: encodeApiKey('es-id', 'es-secret') });

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
