/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useCaseConfigure, ReturnUseCaseConfigure, PersistCaseConfigure } from './use_configure';
import { caseConfigurationCamelCaseResponseMock } from './mock';
import * as api from './api';

jest.mock('./api');

const configuration: PersistCaseConfigure = {
  connectorId: '456',
  connectorName: 'My Connector 2',
  closureType: 'close-by-pushing',
};

describe('useConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const args = {
    setConnector: jest.fn(),
    setClosureType: jest.fn(),
    setCurrentConfiguration: jest.fn(),
  };

  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: true,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('fetch case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('fetch case configuration - setConnector', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(args.setConnector).toHaveBeenCalledWith('123', 'My Connector');
    });
  });

  test('fetch case configuration - setClosureType', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(args.setClosureType).toHaveBeenCalledWith('close-by-user');
    });
  });

  test('fetch case configuration - setCurrentConfiguration', async () => {
    await act(async () => {
      const { waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(args.setCurrentConfiguration).toHaveBeenCalledWith({
        connectorId: '123',
        closureType: 'close-by-user',
      });
    });
  });

  test('fetch case configuration - only setConnector', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure({ setConnector: jest.fn() })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('refetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();
      expect(spyOnGetCaseConfigure).toHaveBeenCalledTimes(2);
    });
  });

  test('set isLoading to true when fetching case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      result.current.refetchCaseConfigure();

      expect(result.current.loading).toBe(true);
    });
  });

  test('persist case configuration', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      expect(result.current).toEqual({
        loading: false,
        persistLoading: true,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('save case configuration - postCaseConfigure', async () => {
    // When there is no version, a configuration is created. Otherwise is updated.
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        version: '',
      })
    );

    const spyOnPostCaseConfigure = jest.spyOn(api, 'postCaseConfigure');
    spyOnPostCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        ...configuration,
      })
    );

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      await waitForNextUpdate();

      expect(args.setConnector).toHaveBeenNthCalledWith(2, '456');
      expect(args.setClosureType).toHaveBeenNthCalledWith(2, 'close-by-pushing');
      expect(args.setCurrentConfiguration).toHaveBeenNthCalledWith(2, {
        connectorId: '456',
        closureType: 'close-by-pushing',
      });
    });
  });

  test('save case configuration - patchCaseConfigure', async () => {
    const spyOnPatchCaseConfigure = jest.spyOn(api, 'patchCaseConfigure');
    spyOnPatchCaseConfigure.mockImplementation(() =>
      Promise.resolve({
        ...caseConfigurationCamelCaseResponseMock,
        ...configuration,
      })
    );

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );
      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      await waitForNextUpdate();

      expect(args.setConnector).toHaveBeenNthCalledWith(2, '456');
      expect(args.setClosureType).toHaveBeenNthCalledWith(2, 'close-by-pushing');
      expect(args.setCurrentConfiguration).toHaveBeenNthCalledWith(2, {
        connectorId: '456',
        closureType: 'close-by-pushing',
      });
    });
  });

  test('save case configuration - only setConnector', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure({ setConnector: jest.fn() })
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('unhappy path - fetch case configuration', async () => {
    const spyOnGetCaseConfigure = jest.spyOn(api, 'getCaseConfigure');
    spyOnGetCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });

  test('unhappy path - persist case configuration', async () => {
    const spyOnPostCaseConfigure = jest.spyOn(api, 'postCaseConfigure');
    spyOnPostCaseConfigure.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, ReturnUseCaseConfigure>(() =>
        useCaseConfigure(args)
      );

      await waitForNextUpdate();
      await waitForNextUpdate();

      result.current.persistCaseConfigure(configuration);

      await waitForNextUpdate();

      expect(result.current).toEqual({
        loading: false,
        persistLoading: false,
        refetchCaseConfigure: result.current.refetchCaseConfigure,
        persistCaseConfigure: result.current.persistCaseConfigure,
      });
    });
  });
});
