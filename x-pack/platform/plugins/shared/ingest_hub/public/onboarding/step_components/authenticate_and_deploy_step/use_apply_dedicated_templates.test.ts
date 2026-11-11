/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import type { DeployGroup } from './deploy_groups';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { SERVICE_SETTINGS_SESSION_KEY } from '../service_settings_step/use_service_settings';
import { useApplyDedicatedTemplates } from './use_apply_dedicated_templates';
import { applyDedicatedNamespaceTemplates } from './apply_dedicated_templates';

const mockAddWarning = jest.fn();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addWarning: mockAddWarning } } } }),
}));
const mockUpdateDeployment = jest.fn();
jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('./use_onboarding_so', () => ({
  useOnboardingSO: () => ({ updateDeployment: mockUpdateDeployment }),
}));
jest.mock('./apply_dedicated_templates', () => ({
  ...jest.requireActual('./apply_dedicated_templates'),
  applyDedicatedNamespaceTemplates: jest.fn(),
}));

const mockApply = applyDedicatedNamespaceTemplates as jest.Mock;

const groups = [
  {
    groupId: 'aws__prod',
    instanceIds: ['elb'],
    members: [{ instance: { instanceId: 'elb' }, service: { packageName: 'aws' } }],
    isDuplicateGroup: false,
    namespace: 'prod',
  },
] as unknown as DeployGroup[];

const render = (props: Partial<Parameters<typeof useApplyDedicatedTemplates>[0]> = {}) =>
  renderHook(
    (hookProps: Parameters<typeof useApplyDedicatedTemplates>[0]) =>
      useApplyDedicatedTemplates(hookProps),
    {
      initialProps: {
        enabled: true,
        isDeployDone: false,
        groups,
        globalNamespace: 'prod',
        ...props,
      },
    }
  );

describe('useApplyDedicatedTemplates', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.resetAllMocks();
    mockApply.mockResolvedValue({
      failedPackages: [],
      blockedDataStreams: [],
      overriddenDataStreams: [],
    });
    (useOnboardingFlow as jest.Mock).mockReturnValue({
      detectAndReviewStep: { onboardingDeploymentId: 'dep-1' },
    });
  });

  it('does nothing before the deploy is done', () => {
    render();

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('applies when a deploy finishes while it is mounted', () => {
    const { rerender } = render();

    rerender({ enabled: true, isDeployDone: true, groups, globalNamespace: 'prod' });

    expect(mockApply).toHaveBeenCalledWith(['aws'], 'prod');
  });

  it('does not apply on its own when it is mounted already done, as on a resume', () => {
    render({ isDeployDone: true });

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('applies when called by hand, for a step that leaves before the deploy state renders', async () => {
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    expect(mockApply).toHaveBeenCalledWith(['aws'], 'prod');
  });

  it('does not repeat a request it already made', async () => {
    const { result, rerender } = render();

    rerender({ enabled: true, isDeployDone: true, groups, globalNamespace: 'prod' });
    await act(async () => {
      await result.current();
    });

    expect(mockApply).toHaveBeenCalledTimes(1);
  });

  it('does nothing while the switch is off', async () => {
    const { result, rerender } = render({ enabled: false });

    rerender({ enabled: false, isDeployDone: true, groups, globalNamespace: 'prod' });
    await act(async () => {
      await result.current();
    });

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('says an existing template blocks the dedicated one where it does', async () => {
    mockApply.mockResolvedValueOnce({
      failedPackages: [],
      blockedDataStreams: ['logs-aws.cloudtrail-prod'],
      overriddenDataStreams: [],
    });
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    const { text } = mockAddWarning.mock.calls[0][0];
    expect(text).toContain(
      "Existing index templates take priority, so the dedicated index templates don't apply to: logs-aws.cloudtrail-prod."
    );
    expect(text).not.toContain('no longer apply');
  });

  it('says the dedicated template replaces a custom one where it does', async () => {
    mockApply.mockResolvedValueOnce({
      failedPackages: [],
      blockedDataStreams: [],
      overriddenDataStreams: ['metrics-aws.ec2_metrics-prod'],
    });
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    const { text } = mockAddWarning.mock.calls[0][0];
    expect(text).toContain(
      'The dedicated index templates now take priority over your existing custom index templates, so the custom settings no longer apply to: metrics-aws.ec2_metrics-prod.'
    );
    expect(text).not.toContain('Existing index templates take priority');
  });

  it('saves the switch with the deployment once it was applied', async () => {
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    expect(mockUpdateDeployment).toHaveBeenCalledWith('dep-1', {
      dedicatedNamespaceTemplates: true,
    });
  });

  it('does not bring the switch back on when it was turned off while this was running', async () => {
    const { result } = render();
    // Back to the settings step, which saves the switch as off at once, before the apply finishes.
    window.sessionStorage.setItem(
      SERVICE_SETTINGS_SESSION_KEY,
      JSON.stringify({ dedicatedNamespaceTemplates: false })
    );

    await act(async () => {
      await result.current();
    });

    expect(mockApply).toHaveBeenCalled();
    expect(mockUpdateDeployment).not.toHaveBeenCalled();
  });

  it('does not save the switch when a package could not be updated', async () => {
    mockApply.mockResolvedValueOnce({
      failedPackages: ['aws'],
      blockedDataStreams: [],
      overriddenDataStreams: [],
    });
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    expect(mockUpdateDeployment).not.toHaveBeenCalled();
  });

  it('writes no record before the first deploy has created one', async () => {
    (useOnboardingFlow as jest.Mock).mockReturnValue({ detectAndReviewStep: {} });
    const { result } = render();

    await act(async () => {
      await result.current();
    });

    expect(mockApply).toHaveBeenCalled();
    expect(mockUpdateDeployment).not.toHaveBeenCalled();
  });

  it('warns about the packages that failed and allows a retry', async () => {
    mockApply.mockResolvedValueOnce({
      failedPackages: ['aws'],
      blockedDataStreams: [],
      overriddenDataStreams: [],
    });
    const { result } = render();

    await act(async () => {
      await result.current();
    });
    expect(mockAddWarning).toHaveBeenCalledTimes(1);
    expect(mockAddWarning.mock.calls[0][0].text).toContain('aws');

    await act(async () => {
      await result.current();
    });
    expect(mockApply).toHaveBeenCalledTimes(2);
  });
});
