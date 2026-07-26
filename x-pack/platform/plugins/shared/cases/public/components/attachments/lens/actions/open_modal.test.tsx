/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unmountComponentAtNode } from 'react-dom';
import { useCasesAddToExistingCaseModal } from '../../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { PropsWithChildren } from 'react';
import React from 'react';
import type { Filter } from '@kbn/es-query';
import {
  getMockApplications$,
  getMockCurrentAppId$,
  getMockLensApi,
  getMockParentApiWithSearchContext,
  mockLensAttributes,
  getMockServices,
} from './mocks';
import { useKibana } from '../../../../common/lib/kibana';
import { waitFor } from '@testing-library/react';
import { openModal } from './open_modal';
import type { CasesActionContextProps } from './types';
import { LENS_ATTACHMENT_TYPE } from '../../../../../common/constants/attachments';

const element = document.createElement('div');
document.body.appendChild(element);

const mockDescription = mockLensAttributes.description as string;

jest.mock('../../../all_cases/selector_modal/use_cases_add_to_existing_case_modal', () => ({
  useCasesAddToExistingCaseModal: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaThemeProvider: jest
    .fn()
    .mockImplementation(({ children }: PropsWithChildren<unknown>) => <>{children}</>),
}));

jest.mock('../../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
    KibanaContextProvider: jest
      .fn()
      .mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
  };
});

jest.mock('react-dom', () => {
  const original = jest.requireActual('react-dom');
  return { ...original, unmountComponentAtNode: jest.fn() };
});

jest.mock('./action_wrapper');

describe('openModal', () => {
  const mockUseCasesAddToExistingCaseModal = useCasesAddToExistingCaseModal as jest.Mock;
  const mockOpenModal = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2024-01-01T00:00:00.000Z') });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockUseCasesAddToExistingCaseModal.mockReturnValue({
      open: mockOpenModal,
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: getMockCurrentAppId$(),
          applications$: getMockApplications$(),
        },
      },
    });

    jest.clearAllMocks();
  });

  it('should open modal with an attachment with the time range as relative values', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();
    });

    const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
    const res = getAttachments();
    expect(res).toEqual([
      {
        type: LENS_ATTACHMENT_TYPE,
        data: {
          state: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2023-12-31T00:00:00.000Z',
              to: '2024-01-01T00:00:00.000Z',
            },
            metadata: { description: mockDescription },
          },
        },
      },
    ]);
  });

  it('should have correct onClose handler - when close modal clicked', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
      onClose();
      expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
    });
  });

  it('should have correct onClose handler - when case selected', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
      onClose({ id: 'case-id', title: 'case-title' });
      expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
    });
  });

  it('should have correct onClose handler - when case created', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
      onClose(null, true);
      expect(unmountComponentAtNode as jest.Mock).not.toHaveBeenCalled();
    });
  });

  it('should have correct onSuccess handler', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      const onSuccess = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess;
      onSuccess();
      expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
    });
  });

  it('should open modal with an attachment with the time range in absolute values', async () => {
    openModal(
      getMockLensApi({ from: '2024-01-09T00:00:00.000Z', to: '2024-01-10T00:00:00.000Z' }),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();
    });

    const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
    const res = getAttachments();
    expect(res).toEqual([
      {
        type: LENS_ATTACHMENT_TYPE,
        data: {
          state: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2024-01-09T00:00:00.000Z',
              to: '2024-01-10T00:00:00.000Z',
            },
            metadata: { description: mockDescription },
          },
        },
      },
    ]);
  });

  it('should open modal with an attachment with the time range in absolute and relative values', async () => {
    openModal(
      getMockLensApi({ from: '2023-12-01T00:00:00.000Z', to: 'now' }),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();
    });

    const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
    const res = getAttachments();

    expect(res).toEqual([
      {
        type: LENS_ATTACHMENT_TYPE,
        data: {
          state: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2023-12-01T00:00:00.000Z',
              to: '2024-01-01T00:00:00.000Z',
            },
            metadata: { description: mockDescription },
          },
        },
      },
    ]);
  });

  describe('merging the parent unified search context', () => {
    const parentFilter: Filter = {
      meta: {
        index: 'my-index-pattern-id',
        type: 'phrase',
        key: 'host.name',
        params: { query: 'host-1' },
        disabled: false,
        negate: false,
      },
      query: { match_phrase: { 'host.name': 'host-1' } },
    };
    const disabledParentFilter: Filter = {
      ...parentFilter,
      meta: { ...parentFilter.meta, disabled: true },
    };
    const parentQuery = { query: 'foo: bar', language: 'kuery' };
    const extractedFilter: Filter = {
      ...parentFilter,
      meta: { ...parentFilter.meta, index: 'extracted-ref-name' },
    };
    const extractedReference = {
      type: 'index-pattern',
      name: 'extracted-ref-name',
      id: 'my-index-pattern-id',
    };

    const getAttachedAttributes = async () => {
      await waitFor(() => {
        expect(mockOpenModal).toHaveBeenCalled();
      });
      const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
      return getAttachments()[0].data.state.attributes;
    };

    it('merges the click-added filter and the search bar query into the attachment', async () => {
      const services = getMockServices();
      (services.plugins.data.query.filterManager.extract as jest.Mock).mockReturnValue({
        state: [extractedFilter],
        references: [extractedReference],
      });

      openModal(
        getMockLensApi(undefined, {
          parentApi: getMockParentApiWithSearchContext({
            filters: [parentFilter],
            query: parentQuery,
          }),
        }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(services.plugins.data.query.filterManager.extract).toHaveBeenCalledWith([
        parentFilter,
      ]);
      expect(attributes).toEqual({
        ...mockLensAttributes,
        references: [...mockLensAttributes.references, extractedReference],
        state: {
          ...mockLensAttributes.state,
          query: parentQuery,
          filters: [extractedFilter],
        },
      });
    });

    it('excludes disabled parent filters before extracting them', async () => {
      const services = getMockServices();

      openModal(
        getMockLensApi(undefined, {
          parentApi: getMockParentApiWithSearchContext({ filters: [disabledParentFilter] }),
        }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(services.plugins.data.query.filterManager.extract).not.toHaveBeenCalled();
      expect(attributes).toEqual(mockLensAttributes);
    });

    it('leaves the attributes untouched when the parent has no filters or query', async () => {
      const services = getMockServices();

      openModal(
        getMockLensApi(undefined, { parentApi: getMockParentApiWithSearchContext() }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(services.plugins.data.query.filterManager.extract).not.toHaveBeenCalled();
      expect(attributes).toEqual(mockLensAttributes);
    });

    it("preserves the panel's own query when the parent publishes the default empty query", async () => {
      const services = getMockServices();

      openModal(
        getMockLensApi(undefined, {
          parentApi: getMockParentApiWithSearchContext({
            query: { query: '', language: 'kuery' },
          }),
        }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(attributes.state.query).toEqual(mockLensAttributes.state.query);
      expect(attributes).toEqual(mockLensAttributes);
    });

    it('does not throw when a legacy Lens document has no state.filters', async () => {
      const services = getMockServices();
      const legacyAttributesWithoutFilters = {
        ...mockLensAttributes,
        state: { ...mockLensAttributes.state, filters: undefined },
      } as unknown as ReturnType<ReturnType<typeof getMockLensApi>['getFullAttributes']>;

      openModal(
        getMockLensApi(undefined, {
          getFullAttributes: () => legacyAttributesWithoutFilters,
          parentApi: getMockParentApiWithSearchContext({ filters: [parentFilter] }),
        }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(attributes.state.filters).toEqual([parentFilter]);
    });

    it('ignores an ES|QL parent query instead of writing it into state.query', async () => {
      const services = getMockServices();

      openModal(
        getMockLensApi(undefined, {
          parentApi: getMockParentApiWithSearchContext({ query: { esql: 'FROM logs-*' } }),
        }),
        'myAppId',
        {} as unknown as CasesActionContextProps,
        services
      );

      const attributes = await getAttachedAttributes();

      expect(attributes.state.query).toEqual(mockLensAttributes.state.query);
      expect(attributes).toEqual(mockLensAttributes);
    });

    it('leaves the attributes untouched when the parent does not publish a unified search context', async () => {
      const services = getMockServices();

      openModal(getMockLensApi(), 'myAppId', {} as unknown as CasesActionContextProps, services);

      const attributes = await getAttachedAttributes();

      expect(services.plugins.data.query.filterManager.extract).not.toHaveBeenCalled();
      expect(attributes).toEqual(mockLensAttributes);
    });
  });
});
