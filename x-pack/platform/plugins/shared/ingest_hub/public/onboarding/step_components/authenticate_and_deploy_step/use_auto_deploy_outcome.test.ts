/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { sendGetCloudOnboardingDeployment } from '@kbn/fleet-plugin/public';

import type { DeployGroup } from './deploy_groups';
import { useAutoDeployOutcome } from './use_auto_deploy_outcome';

jest.mock('@kbn/fleet-plugin/public', () => ({ sendGetCloudOnboardingDeployment: jest.fn() }));

const mockedGetDeployment = jest.mocked(sendGetCloudOnboardingDeployment);

const group = (groupId: string, instanceIds: string[]): DeployGroup =>
  ({
    groupId,
    instanceIds,
    members: [],
    isDuplicateGroup: false,
    namespace: 'default',
  } as DeployGroup);
const deployGroups = [group('aws', ['a', 'b']), group('aws_bedrock', ['c'])];

describe('useAutoDeployOutcome', () => {
  const updateDetectAndReviewStep = jest.fn();
  const persistDeploymentId = jest.fn();
  const setFailedInstances = jest.fn();

  const render = () =>
    renderHook(() =>
      useAutoDeployOutcome({
        deployGroups,
        updateDetectAndReviewStep,
        persistDeploymentId,
        setFailedInstances,
      })
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies a finished deploy the way a Deploy click does', async () => {
    mockedGetDeployment.mockResolvedValue({
      item: {
        id: 'dep-1',
        status: 'succeeded',
        policyIdsByInstance: { a: 'pp-1', b: 'pp-1', c: 'pp-2' },
      },
    } as any);
    const { result } = render();

    await act(async () => {
      await result.current.applyOutcome({ status: 'deployed', onboardingDeploymentId: 'dep-1' });
    });

    expect(mockedGetDeployment).toHaveBeenCalledWith('dep-1');
    expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
      isDeploying: false,
      serviceStatuses: { a: 'detecting', b: 'detecting', c: 'detecting' },
      policyIdsByInstance: { a: 'pp-1', b: 'pp-1', c: 'pp-2' },
      failedInstances: [],
      deployErrors: {},
      // The drift check that ran while the server was still writing the deployment compared the
      // session's identity against an object without one; the finished deploy settles that.
      isDirty: false,
      isAuthDirty: false,
      isPolicySelectionDirty: false,
    });
    expect(setFailedInstances).toHaveBeenCalledWith([]);
    // Now the URL may carry the id: the deploy is done and edit mode is correct.
    expect(persistDeploymentId).toHaveBeenCalledWith('dep-1');
  });

  it('marks the services without a policy as failed with the deployment error', async () => {
    mockedGetDeployment.mockResolvedValue({
      item: {
        id: 'dep-1',
        status: 'failed',
        statusMessage: 'Deploy failed for c: package not installed',
        policyIdsByInstance: { a: 'pp-1', b: 'pp-1' },
      },
    } as any);
    const { result } = render();

    await act(async () => {
      await result.current.applyOutcome({
        status: 'failed',
        onboardingDeploymentId: 'dep-1',
        error: 'Deploy failed for c: package not installed',
      });
    });

    expect(updateDetectAndReviewStep).toHaveBeenCalledWith({
      isDeploying: false,
      serviceStatuses: { a: 'detecting', b: 'detecting', c: 'error' },
      policyIdsByInstance: { a: 'pp-1', b: 'pp-1' },
      failedInstances: ['c'],
      deployErrors: { c: 'Deploy failed for c: package not installed' },
      isDirty: false,
      isAuthDirty: false,
      isPolicySelectionDirty: false,
    });
    expect(setFailedInstances).toHaveBeenCalledWith(['c']);
    expect(persistDeploymentId).toHaveBeenCalledWith('dep-1');
  });

  it('treats every service as failed when the deployment cannot be read back', async () => {
    mockedGetDeployment.mockRejectedValue(new Error('gone'));
    const { result } = render();

    await act(async () => {
      await result.current.applyOutcome({ status: 'deployed', onboardingDeploymentId: 'dep-1' });
    });

    expect(updateDetectAndReviewStep).toHaveBeenCalledWith(
      expect.objectContaining({
        failedInstances: ['a', 'b', 'c'],
        deployErrors: { a: 'gone', b: 'gone', c: 'gone' },
      })
    );
    expect(persistDeploymentId).toHaveBeenCalledWith('dep-1');
  });
});
