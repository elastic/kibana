/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { PROPOSALS_API_PRIVILEGE_MANAGE, PROPOSALS_API_PRIVILEGE_READ } from '../constants';
import { createProposalPrivilegesChecker } from './check_proposal_privileges';
import { ProposalForbiddenError } from './errors';

const request = httpServerMock.createKibanaRequest();

const createSecurity = (hasAllRequested: boolean) => {
  const checkPrivileges = jest.fn().mockResolvedValue({ hasAllRequested });
  return {
    security: {
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(checkPrivileges),
        // Mirrors the real builder: the feature declares bare operation names,
        // and only the `api:` action is what `checkPrivileges` recognises.
        actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      },
    } as unknown as SecurityPluginStart,
    checkPrivileges,
  };
};

const createChecker = (security?: SecurityPluginStart) => {
  const logger = loggerMock.create();
  return {
    checker: createProposalPrivilegesChecker({
      getSecurity: async () => security,
      logger,
    }),
    logger,
  };
};

describe('createProposalPrivilegesChecker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assertCanManage', () => {
    it('should resolve when the principal holds the manage privilege', async () => {
      const { security, checkPrivileges } = createSecurity(true);
      const { checker } = createChecker(security);

      await expect(checker.assertCanManage(request)).resolves.toBeUndefined();

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${PROPOSALS_API_PRIVILEGE_MANAGE}`],
      });
    });

    it('should throw when the principal does not hold it', async () => {
      const { security } = createSecurity(false);
      const { checker } = createChecker(security);

      // Throws rather than degrading: a Worker without the privilege to write
      // proposals is a misconfiguration, not something to retry.
      await expect(checker.assertCanManage(request)).rejects.toBeInstanceOf(ProposalForbiddenError);
    });
  });

  describe('assertCanRead', () => {
    it('should check the read privilege rather than manage', async () => {
      const { security, checkPrivileges } = createSecurity(true);
      const { checker } = createChecker(security);

      await checker.assertCanRead(request);

      expect(checkPrivileges).toHaveBeenCalledWith({
        kibana: [`api:${PROPOSALS_API_PRIVILEGE_READ}`],
      });
    });
  });

  describe('canManage', () => {
    it('should report a refusal rather than throwing', async () => {
      const { security } = createSecurity(false);
      const { checker } = createChecker(security);

      // The gate loop re-parks on a false, so a denial must stay recoverable.
      await expect(checker.canManage(request)).resolves.toBe(false);
    });

    it('should report an allowance', async () => {
      const { security } = createSecurity(true);
      const { checker } = createChecker(security);

      await expect(checker.canManage(request)).resolves.toBe(true);
    });

    it('should let an unexpected failure throw rather than reading as a refusal', async () => {
      const { security, checkPrivileges } = createSecurity(true);
      checkPrivileges.mockRejectedValue(new Error('privilege service unavailable'));
      const { checker } = createChecker(security);

      // A privilege service that is down is not the same thing as a refusal,
      // and a loop that treated it as one would re-park forever.
      await expect(checker.canManage(request)).rejects.toThrow('privilege service unavailable');
    });
  });

  describe('fail closed', () => {
    it('should deny every check when security is unavailable', async () => {
      const { checker, logger } = createChecker(undefined);

      await expect(checker.canManage(request)).resolves.toBe(false);
      await expect(checker.assertCanManage(request)).rejects.toBeInstanceOf(ProposalForbiddenError);
      await expect(checker.assertCanRead(request)).rejects.toBeInstanceOf(ProposalForbiddenError);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fails closed'));
    });
  });
});
