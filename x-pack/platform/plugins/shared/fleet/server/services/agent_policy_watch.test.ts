/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import pRetry from 'p-retry';
import { Subject } from 'rxjs';

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import type { SavedObjectError } from '@kbn/core-saved-objects-common';

import type { AgentPolicy } from '../../common';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../common';

import { LicenseService } from '../../common/services';

import { createAgentPolicyMock } from '../../common/mocks';

import { PolicyWatcher } from './agent_policy_watch';
import { agentPolicyService } from './agent_policy';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from './app_context';

jest.mock('./agent_policy');
const agentPolicySvcMock = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

jest.mock('p-retry', () => {
  const originalPRetry = jest.requireActual('p-retry');
  return jest.fn().mockImplementation((fn, options) => {
    return originalPRetry(fn, options);
  });
});

const pRetryMock = jest.mocked(pRetry);

describe('Agent Policy-Changing license watcher', () => {
  const logger = loggingSystemMock.create().get('license_watch.test');
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    soClientMock =
      appContextService.getInternalUserSOClientWithoutSpaceExtension() as jest.Mocked<SavedObjectsClientContract>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    pRetryMock.mockClear();
  });

  const createPolicySO = (id: string, isProtected: boolean, error?: SavedObjectError) => ({
    id,
    type: LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
    attributes: {
      is_protected: isProtected,
    },
    references: [],
    score: 1,
    ...(error ? { error } : {}),
  });

  it('is activated on license changes', () => {
    // mock a license-changing service to test reactivity
    const licenseEmitter: Subject<ILicense> = new Subject();
    const licenseService = new LicenseService();
    const pw = new PolicyWatcher(logger);

    // swap out watch function, just to ensure it gets called when a license change happens
    const mockWatch = jest.fn();
    pw.watch = mockWatch;

    // licenseService is watching our subject for incoming licenses
    licenseService.start(licenseEmitter);
    pw.start(licenseService); // and the PolicyWatcher under test, uses that to subscribe as well

    // Enqueue a license change!
    licenseEmitter.next(Platinum);

    // policywatcher should have triggered
    expect(mockWatch.mock.calls.length).toBe(1);

    pw.stop();
    licenseService.stop();
    licenseEmitter.complete();
  });

  it('should return if all policies are compliant', async () => {
    jest.spyOn(agentPolicySvcMock, 'fetchAllAgentPolicies').mockReturnValue([] as any);

    const pw = new PolicyWatcher(logger);

    // emulate a license change below paid tier
    await pw.watch(Platinum);

    expect(logger.info).toHaveBeenLastCalledWith(
      'All agent policies are compliant, nothing to do!'
    );
  });

  it('should bulk update policies that are not compliant', async () => {
    const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
      jest.fn().mockResolvedValue(
        jest.fn(async function* () {
          const chunkSize = 1000; // Emulate paginated response
          for (let i = 0; i < items.length; i += chunkSize) {
            yield items.slice(i, i + chunkSize);
          }
        })()
      );

    const policiesToUpdate = Array.from({ length: 2001 }, (_, i) =>
      createAgentPolicyMock({ id: `policy${i}`, is_protected: true })
    );

    const updatedSOs = policiesToUpdate.map((policy) => createPolicySO(policy.id, false));

    agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
      createAgentPolicyMock(),
      ...policiesToUpdate,
    ]); // Add one policy that should not be updated

    const pw = new PolicyWatcher(logger);

    // Mock paginated responses

    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(0, 1000),
    });
    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(1000, 2000),
    });
    soClientMock.bulkUpdate.mockResolvedValueOnce({
      saved_objects: updatedSOs.slice(2000),
    });

    // emulate a license change below paid tier
    await pw.watch(Basic);

    // 3 calls to bulkUpdate, 2001 policies to update, 1000 per call
    expect(soClientMock.bulkUpdate.mock.calls[0][0]).toHaveLength(999); // First fetched policy should not be updated due to is_protected: false
    expect(soClientMock.bulkUpdate.mock.calls[1][0]).toHaveLength(1000);
    expect(soClientMock.bulkUpdate.mock.calls[2][0]).toHaveLength(2);

    expect(soClientMock.bulkUpdate).toHaveBeenCalledTimes(3);

    expect(soClientMock.bulkUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'policy1',
          attributes: expect.objectContaining({ is_protected: false }),
        }),
      ])
    );

    expect(logger.info).toHaveBeenLastCalledWith(
      'Done - 2001 out of 2001 were successful. No errors encountered.'
    );
  });

  it('should return failed policies if bulk update fails', async () => {
    const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
      jest.fn().mockResolvedValue(
        jest.fn(async function* () {
          yield items;
        })()
      );

    agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
      createAgentPolicyMock({ is_protected: true }),
      createAgentPolicyMock({ is_protected: true }),
    ]);

    const pw = new PolicyWatcher(logger);

    soClientMock.bulkUpdate.mockResolvedValue({
      saved_objects: [
        createPolicySO('agent-policy-1', false),
        createPolicySO('agent-policy-2', false, {
          error: 'error',
          statusCode: 500,
          message: 'error-test',
        }),
      ],
    });

    await expect(pw.watch(Basic)).rejects.toThrow(
      'Done - 1 out of 2 were unsuccessful. Errors encountered:\n' +
        'Policy [agent-policy-2] failed to update due to error: error-test'
    );

    expect(logger.error).toHaveBeenLastCalledWith(
      'Done - 1 out of 2 were unsuccessful. Errors encountered:\n' +
        'Policy [agent-policy-2] failed to update due to error: error-test'
    );
  });

  describe('retry logic', () => {
    it('should wrap watch method with retry logic on start', async () => {
      const licenseEmitter: Subject<ILicense> = new Subject();
      const licenseService = new LicenseService();
      const pw = new PolicyWatcher(logger);

      licenseService.start(licenseEmitter);
      pw.start(licenseService);

      const mockWatch = jest.fn().mockResolvedValue(undefined);
      pw.watch = mockWatch;

      licenseEmitter.next(Platinum);

      // wait for async ops
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(pRetryMock).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000,
          onFailedAttempt: expect.any(Function),
        })
      );

      pw.stop();
      licenseService.stop();
      licenseEmitter.complete();
    });

    it('should log retry attempts with proper message format', async () => {
      const licenseEmitter: Subject<ILicense> = new Subject();
      const licenseService = new LicenseService();
      const pw = new PolicyWatcher(logger);

      pRetryMock.mockImplementationOnce((fn: any, options: any) => {
        // simulate failed attempts
        const mockError1 = {
          message: 'Network timeout',
          attemptNumber: 1,
          retriesLeft: 2,
        };
        options.onFailedAttempt(mockError1);

        const mockError2 = {
          message: 'Connection refused',
          attemptNumber: 2,
          retriesLeft: 1,
        };
        options.onFailedAttempt(mockError2);

        // finally succeed
        return Promise.resolve();
      });

      licenseService.start(licenseEmitter);
      pw.start(licenseService);

      const mockWatch = jest.fn().mockResolvedValue(undefined);
      pw.watch = mockWatch;

      licenseEmitter.next(Platinum);

      // wait for async ops
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to process agent policy license compliance (attempt 1/3): Network timeout'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to process agent policy license compliance (attempt 2/3): Connection refused'
      );

      pw.stop();
      licenseService.stop();
      licenseEmitter.complete();
    });

    it('should throw error if watch method throws after exhausting retries', async () => {
      const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
        jest.fn().mockResolvedValue(
          jest.fn(async function* () {
            yield items;
          })()
        );

      agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
        createAgentPolicyMock({ is_protected: true }),
      ]);

      const pw = new PolicyWatcher(logger);

      soClientMock.bulkUpdate.mockResolvedValue({
        saved_objects: [
          createPolicySO('agent-policy-1', false, {
            error: 'error',
            statusCode: 500,
            message: 'All policies failed to update',
          }),
        ],
      });

      await expect(pw.watch(Basic)).rejects.toThrow(
        'Done - all 1 failed to update. Errors encountered:\nPolicy [agent-policy-1] failed to update due to error: All policies failed to update'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Done - all 1 failed to update. Errors encountered:\nPolicy [agent-policy-1] failed to update due to error: All policies failed to update'
      );
    });

    it('should throw error when some policies fail to update', async () => {
      const getMockAgentPolicyFetchAllAgentPolicies = (items: AgentPolicy[]) =>
        jest.fn().mockResolvedValue(
          jest.fn(async function* () {
            yield items;
          })()
        );

      agentPolicySvcMock.fetchAllAgentPolicies = getMockAgentPolicyFetchAllAgentPolicies([
        createAgentPolicyMock({ id: 'policy-1', is_protected: true }),
        createAgentPolicyMock({ id: 'policy-2', is_protected: true }),
      ]);

      const pw = new PolicyWatcher(logger);

      soClientMock.bulkUpdate.mockResolvedValue({
        saved_objects: [
          createPolicySO('policy-1', false),
          createPolicySO('policy-2', false, {
            error: 'error',
            statusCode: 500,
            message: 'Failed to update policy',
          }),
        ],
      });

      await expect(pw.watch(Basic)).rejects.toThrow(
        'Done - 1 out of 2 were unsuccessful. Errors encountered:\nPolicy [policy-2] failed to update due to error: Failed to update policy'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Done - 1 out of 2 were unsuccessful. Errors encountered:\nPolicy [policy-2] failed to update due to error: Failed to update policy'
      );
    });
  });
});
