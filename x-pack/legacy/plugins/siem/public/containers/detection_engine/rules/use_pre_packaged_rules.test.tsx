/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { ReturnPrePackagedRules, usePrePackagedRules } from './use_pre_packaged_rules';
import * as api from './api';

jest.mock('./api');

describe('usePersistRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: null,
          hasIndexWrite: null,
          hasManageApiKey: null,
          isAuthenticated: null,
          hasEncryptionKey: null,
          isSignalIndexExists: null,
        })
      );

      await waitForNextUpdate();

      expect(result.current).toEqual({
        createPrePackagedRules: null,
        loading: true,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: null,
        rulesCustomInstalled: null,
        rulesInstalled: null,
        rulesNotInstalled: null,
        rulesNotUpdated: null,
      });
    });
  });

  test('fetch getPrePackagedRulesStatus', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: null,
          hasIndexWrite: null,
          hasManageApiKey: null,
          isAuthenticated: null,
          hasEncryptionKey: null,
          isSignalIndexExists: null,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        createPrePackagedRules: result.current.createPrePackagedRules,
        loading: false,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: result.current.refetchPrePackagedRulesStatus,
        rulesCustomInstalled: 33,
        rulesInstalled: 12,
        rulesNotInstalled: 0,
        rulesNotUpdated: 0,
      });
    });
  });

  test('happy path to createPrePackagedRules', async () => {
    const spyOnCreatePrepackagedRules = jest.spyOn(api, 'createPrepackagedRules');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(true);
      expect(spyOnCreatePrepackagedRules).toHaveBeenCalled();
      expect(result.current).toEqual({
        createPrePackagedRules: result.current.createPrePackagedRules,
        loading: false,
        loadingCreatePrePackagedRules: false,
        refetchPrePackagedRulesStatus: result.current.refetchPrePackagedRulesStatus,
        rulesCustomInstalled: 33,
        rulesInstalled: 12,
        rulesNotInstalled: 0,
        rulesNotUpdated: 0,
      });
    });
  });

  test('unhappy path to createPrePackagedRules', async () => {
    const spyOnCreatePrepackagedRules = jest.spyOn(api, 'createPrepackagedRules');
    spyOnCreatePrepackagedRules.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
      expect(spyOnCreatePrepackagedRules).toHaveBeenCalled();
    });
  });

  test('can NOT createPrePackagedRules because canUserCrud === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: false,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because hasIndexWrite === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: false,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because hasManageApiKey === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: false,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because isAuthenticated === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: false,
          hasEncryptionKey: true,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because hasEncryptionKey === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: false,
          isSignalIndexExists: true,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });

  test('can NOT createPrePackagedRules because isSignalIndexExists === false', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<unknown, ReturnPrePackagedRules>(() =>
        usePrePackagedRules({
          canUserCRUD: true,
          hasIndexWrite: true,
          hasManageApiKey: true,
          isAuthenticated: true,
          hasEncryptionKey: true,
          isSignalIndexExists: false,
        })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      let resp = null;
      if (result.current.createPrePackagedRules) {
        resp = await result.current.createPrePackagedRules();
      }
      expect(resp).toEqual(false);
    });
  });
});
