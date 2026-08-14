/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { CPSPluginStart } from '@kbn/cps/public';
import { useIsCpsMultiProject } from './use_is_cps_multi_project';

const mockUseKibana = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

const renderWithCps = (cps: CPSPluginStart | undefined) => {
  mockUseKibana.mockReturnValue({ dependencies: { start: { cps } } });
  return renderHook(() => useIsCpsMultiProject());
};

const getCpsManager = (cps: CPSPluginStart) => {
  const { cpsManager } = cps;
  if (!cpsManager) {
    throw new Error('expected cpsManager on start contract');
  }
  return cpsManager;
};

describe('useIsCpsMultiProject', () => {
  it('is false when the cps plugin is not available', () => {
    const { result } = renderWithCps(undefined);

    expect(result.current).toBe(false);
  });

  it('is false when cps is available but there is no linked project', async () => {
    const cps = cpsPluginMock.createStartContract();
    const cpsManager = getCpsManager(cps);
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(false);

    const { result } = renderWithCps(cps);

    await waitFor(() => {
      expect(cpsManager.whenReady).toHaveBeenCalled();
    });
    expect(result.current).toBe(false);
  });

  it('is true when cps has at least one linked project', async () => {
    const cps = cpsPluginMock.createStartContract();
    const cpsManager = getCpsManager(cps);
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(true);

    const { result } = renderWithCps(cps);

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('stays false until cpsManager.whenReady resolves', async () => {
    let resolveReady = () => {};
    const whenReady = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });

    const cps = cpsPluginMock.createStartContract();
    const cpsManager = getCpsManager(cps);
    jest.mocked(cpsManager.whenReady).mockReturnValue(whenReady);
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(true);

    const { result } = renderWithCps(cps);

    expect(result.current).toBe(false);
    expect(cpsManager.hasLinkedProjects).not.toHaveBeenCalled();

    resolveReady();

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('stays false when whenReady rejects', async () => {
    const cps = cpsPluginMock.createStartContract();
    const cpsManager = getCpsManager(cps);
    jest.mocked(cpsManager.whenReady).mockRejectedValue(new Error('cps failed'));
    jest.mocked(cpsManager.hasLinkedProjects).mockReturnValue(true);

    const { result } = renderWithCps(cps);

    await waitFor(() => {
      expect(cpsManager.whenReady).toHaveBeenCalled();
    });
    expect(result.current).toBe(false);
    expect(cpsManager.hasLinkedProjects).not.toHaveBeenCalled();
  });
});
