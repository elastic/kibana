/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import type { DeployGroup } from './deploy_groups';
import { useApplyDedicatedTemplates } from './use_apply_dedicated_templates';
import { applyDedicatedNamespaceTemplates } from './apply_dedicated_templates';

const mockAddWarning = jest.fn();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addWarning: mockAddWarning } } } }),
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
    jest.resetAllMocks();
    mockApply.mockResolvedValue([]);
  });

  it('does nothing before the deploy is done', () => {
    render();

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('applies once the deploy is done', () => {
    const { rerender } = render();

    rerender({ enabled: true, isDeployDone: true, groups, globalNamespace: 'prod' });

    expect(mockApply).toHaveBeenCalledWith(['aws'], 'prod');
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

  it('warns about the packages that failed and allows a retry', async () => {
    mockApply.mockResolvedValueOnce(['aws']);
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
