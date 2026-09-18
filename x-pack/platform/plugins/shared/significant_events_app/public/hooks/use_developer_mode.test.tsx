/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { OBSERVABILITY_NIGHTSHIFT_DEVELOPER_MODE } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';
import { useDeveloperMode } from './use_developer_mode';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const setUiSetting = jest.fn();
const addDanger = jest.fn();

const setup = ({
  enabled = false,
  canSaveAdvancedSettings = true,
}: {
  enabled?: boolean;
  canSaveAdvancedSettings?: boolean;
} = {}) => {
  const developerMode$ = new BehaviorSubject(enabled);
  const updateErrors$ = new Subject<Error>();
  setUiSetting.mockImplementation(async (_key: string, value: boolean) => {
    developerMode$.next(value);
    return true;
  });

  mockUseKibana.mockReturnValue({
    core: {
      application: {
        capabilities: {
          advancedSettings: {
            save: canSaveAdvancedSettings,
          },
        },
      },
      settings: {
        client: {
          get: jest.fn().mockReturnValue(enabled),
          get$: jest.fn().mockReturnValue(developerMode$),
          getUpdateErrors$: jest.fn().mockReturnValue(updateErrors$),
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

  return { developerMode$, updateErrors$ };
};

describe('useDeveloperMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to false', () => {
    setup({ enabled: false });
    const { result } = renderHook(() => useDeveloperMode());
    expect(result.current.isDeveloperMode).toBe(false);
    expect(result.current.canEditDeveloperMode).toBe(true);
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

  it('toasts when the setting cannot be saved', async () => {
    const { updateErrors$ } = setup({ enabled: false });
    setUiSetting.mockImplementation(async () => {
      updateErrors$.next(new Error('save failed'));
      return false;
    });
    const { result } = renderHook(() => useDeveloperMode());

    await act(async () => {
      await result.current.setDeveloperMode(true);
    });

    expect(addDanger).toHaveBeenCalledWith({
      title: 'Unable to update developer mode',
      text: 'save failed',
    });
  });

  it('disables editing without advancedSettings.save', () => {
    setup({ canSaveAdvancedSettings: false });
    const { result } = renderHook(() => useDeveloperMode());
    expect(result.current.canEditDeveloperMode).toBe(false);
  });
});
