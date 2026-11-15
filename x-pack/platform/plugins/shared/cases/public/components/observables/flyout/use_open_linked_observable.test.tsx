/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderHook } from '@testing-library/react';
import { mockObservables } from '../../../containers/mock';
import { useFindObservables } from '../../../containers/use_find_observables';
import { useOpenLinkedObservable } from './use_open_linked_observable';

jest.mock('../../../containers/use_find_observables');

const useFindObservablesMock = jest.mocked(useFindObservables);
const [linkedObservable, otherObservable] = mockObservables;

const mockStored = (observables: typeof mockObservables) =>
  useFindObservablesMock.mockReturnValue({
    data: { observables, total: observables.length },
  } as unknown as ReturnType<typeof useFindObservables>);

const renderWithUrl = (url: string, onOpen = jest.fn()) =>
  renderHook(
    () => {
      useOpenLinkedObservable('case-1', onOpen);
      return useLocation();
    },
    {
      wrapper: ({ children }: PropsWithChildren) => (
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      ),
    }
  );

const linkTo = ({ typeKey, value }: { typeKey: string; value: string }) =>
  `/cases/case-1?${new URLSearchParams({
    tabId: 'observables',
    observableTypeKey: typeKey,
    observableValue: value,
  })}`;

describe('useOpenLinkedObservable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStored([otherObservable, linkedObservable]);
  });

  it('looks the linked observable up by type and value', () => {
    renderWithUrl(linkTo(linkedObservable));

    expect(useFindObservablesMock).toHaveBeenCalledWith(
      'case-1',
      {
        typeKeys: [linkedObservable.typeKey],
        search: linkedObservable.value,
        sortField: 'value',
        sortOrder: 'asc',
        perPage: 10,
      },
      { enabled: true }
    );
  });

  it('opens the flyout of the linked observable once, then drops the link from the URL', () => {
    const onOpen = jest.fn();
    const { result, rerender } = renderWithUrl(linkTo(linkedObservable), onOpen);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(linkedObservable);
    expect(new URLSearchParams(result.current.search).toString()).toBe('tabId=observables');

    rerender();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens nothing when the linked observable is not in the case', () => {
    const onOpen = jest.fn();
    renderWithUrl(linkTo({ typeKey: linkedObservable.typeKey, value: '192.168.0.1' }), onOpen);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not look anything up without a link', () => {
    const onOpen = jest.fn();
    renderWithUrl('/cases/case-1?tabId=observables', onOpen);

    expect(useFindObservablesMock).toHaveBeenCalledWith('case-1', expect.anything(), {
      enabled: false,
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
