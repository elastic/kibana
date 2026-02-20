/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCheckDocumentAttachments } from './use_check_alert_attachments';
import { useFindCasesContainingAllSelectedDocuments } from './use_find_cases_containing_all_selected_alerts';

jest.mock('./use_find_cases_containing_all_selected_alerts');

const cases = [{ id: 'case-1' }, { id: 'case-2' }];

describe('useCheckDocumentAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFindCasesContainingAllSelectedDocuments as jest.Mock).mockReturnValue({
      data: { casesWithAllAttachments: [] },
      isFetching: false,
    });
  });

  it('calls useFindCasesContainingAllSelectedDocuments with selected document IDs and case IDs', () => {
    const getAttachments = jest
      .fn()
      .mockReturnValue([
        { alertId: 'alert-1' },
        { eventId: 'event-1' },
        { alertId: 'alert-2', eventId: 'event-2' },
        { externalReferenceId: 'external-ref-1' },
        { comment: 'ignore-me' },
      ]);

    renderHook(() => useCheckDocumentAttachments({ cases, getAttachments }));

    expect(getAttachments).toHaveBeenCalledWith({ theCase: undefined });
    expect(useFindCasesContainingAllSelectedDocuments).toHaveBeenCalledWith(
      ['alert-1', 'event-1', 'alert-2', 'event-2', 'external-ref-1'],
      ['case-1', 'case-2']
    );
  });

  it('filters out empty document IDs', () => {
    const getAttachments = jest
      .fn()
      .mockReturnValue([
        { alertId: '' },
        { alertId: null },
        { eventId: undefined },
        { externalReferenceId: '' },
        { externalReferenceId: undefined },
        { eventId: 'event-1' },
        { externalReferenceId: 'external-ref-1' },
      ]);

    renderHook(() => useCheckDocumentAttachments({ cases, getAttachments }));

    expect(useFindCasesContainingAllSelectedDocuments).toHaveBeenCalledWith(
      ['event-1', 'external-ref-1'],
      ['case-1', 'case-2']
    );
  });

  it('flattens array-based document references including externalReferenceId', () => {
    const getAttachments = jest
      .fn()
      .mockReturnValue([
        { alertId: ['alert-1', 'alert-2'] },
        { alertId: 'alert-3' },
        { eventId: ['event-1'] },
        { externalReferenceId: ['external-ref-1', 'external-ref-2'] },
      ]);

    renderHook(() => useCheckDocumentAttachments({ cases, getAttachments }));

    expect(useFindCasesContainingAllSelectedDocuments).toHaveBeenCalledWith(
      ['alert-1', 'alert-2', 'alert-3', 'event-1', 'external-ref-1', 'external-ref-2'],
      ['case-1', 'case-2']
    );
  });

  it('returns disabled cases and loading state from query results', () => {
    (useFindCasesContainingAllSelectedDocuments as jest.Mock).mockReturnValue({
      data: { casesWithAllAttachments: ['case-2'] },
      isFetching: true,
    });

    const { result } = renderHook(() =>
      useCheckDocumentAttachments({
        cases,
        getAttachments: () => [],
      })
    );

    expect(result.current.disabledCases).toEqual(new Set(['case-2']));
    expect(result.current.isLoading).toBe(true);
  });

  it('returns an empty disabled cases set when query data is not available', () => {
    (useFindCasesContainingAllSelectedDocuments as jest.Mock).mockReturnValue({
      data: undefined,
      isFetching: false,
    });

    const { result } = renderHook(() =>
      useCheckDocumentAttachments({
        cases,
        getAttachments: () => [],
      })
    );

    expect(result.current.disabledCases).toEqual(new Set());
    expect(result.current.isLoading).toBe(false);
  });

  it('uses empty selected documents when getAttachments is not provided', () => {
    renderHook(() => useCheckDocumentAttachments({ cases }));

    expect(useFindCasesContainingAllSelectedDocuments).toHaveBeenCalledWith(
      [],
      ['case-1', 'case-2']
    );
  });
});
