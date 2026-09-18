/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';
import { useDeveloperMode } from './use_developer_mode';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const setUiSetting = jest.fn();
const addDanger = jest.fn();

const setup = ({ enabled = false }: { enabled?: boolean } = {}) => {
  const developerMode$ = new BehaviorSubject(enabled);
  setUiSetting.mockImplementation(async (_key: string, value: boolean) => {
    developerMode$.next(value);
    return true;
  });

  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: {},
      },
      settings: {
        client: {
          get: jest.fn().mockReturnValue(enabled),
          get$: jest.fn().mockReturnValue(developerMode$),
          set: setUiSetting,
        },
      },
      notifications: {
        toasts: {
          addDanger,
        },
      },
    },
  } as never);

  return { developerMode$ };
};

describe('useDeveloperMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to false', () => {
    setup({ enabled: false });
    const { result } = renderHook(() => useDeveloperMode());
    expect(result.current.isDeveloperMode).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('updates when the uiSetting observable emits', async () => {
    const { developerMode$ } = setup({ enabled: false });
    const { result } = renderHook(() => useDeveloperMode());

    expect(result.current.isDeveloperMode).toBe(false);

    act(() => {
      developerMode$.next(true);
    });

    await waitFor(() => {
      expect(result.current.isDeveloperMode).toBe(true);
    });
  });

  it('persists the setting immediately', async () => {
    setup({ enabled: false });
    const { result } = renderHook(() => useDeveloperMode());

    await act(async () => {
      await result.current.setDeveloperMode(true);
    });

    expect(setUiSetting).toHaveBeenCalledWith(OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE, true);
  });

  it('sets isSaving while the request is in flight', async () => {
    let resolveSave!: (value: boolean) => void;
    setUiSetting.mockReturnValue(new Promise<boolean>((resolve) => (resolveSave = resolve)));
    setup({ enabled: false });
    const { result } = renderHook(() => useDeveloperMode());

    act(() => {
      void result.current.setDeveloperMode(true);
    });

    await waitFor(() => expect(result.current.isSaving).toBe(true));

    await act(async () => {
      resolveSave(true);
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('toasts when the setting cannot be saved', async () => {
    setup({ enabled: false });
    setUiSetting.mockResolvedValue(false);
    const { result } = renderHook(() => useDeveloperMode());

    await act(async () => {
      await result.current.setDeveloperMode(true);
    });

    expect(addDanger).toHaveBeenCalledWith({
      title: 'Unable to update developer mode',
      text: 'The developer mode setting could not be saved.',
    });
  });
});
