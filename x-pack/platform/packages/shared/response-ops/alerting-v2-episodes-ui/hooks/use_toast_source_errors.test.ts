/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { EpisodeFetchErrorSurface } from '../types/episode_data_source';
import { useToastSourceErrors } from './use_toast_source_errors';

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } });

describe('useToastSourceErrors', () => {
  it('names the v2 source in the list toast title', () => {
    const addError = jest.fn();
    const error = new Error('v2 failed');

    renderHook(() => useToastSourceErrors([{ sourceId: 'v2', error }], { addError }, 'list'));

    expect(addError).toHaveBeenCalledTimes(1);
    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch alert episodes for v2 alerts',
    });
  });

  it('names the v1 source in the list toast title', () => {
    const addError = jest.fn();
    const error = new Error('classic failed');

    renderHook(() => useToastSourceErrors([{ sourceId: 'v1', error }], { addError }, 'list'));

    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch alert episodes for v1 alerts',
    });
  });

  it('names each failing source on the KPIs surface', () => {
    const addError = jest.fn();
    const classicError = new Error('classic kpis failed');
    const v2Error = new Error('v2 kpis failed');

    renderHook(() =>
      useToastSourceErrors(
        [
          { sourceId: 'v1', error: classicError },
          { sourceId: 'v2', error: v2Error },
        ],
        { addError },
        'kpis'
      )
    );

    expect(addError).toHaveBeenCalledTimes(2);
    expect(addError).toHaveBeenNthCalledWith(1, classicError, {
      title: 'Failed to fetch KPIs for v1 alerts',
    });
    expect(addError).toHaveBeenNthCalledWith(2, v2Error, {
      title: 'Failed to fetch KPIs for v2 alerts',
    });
  });

  it('names the failing source on the histogram surface', () => {
    const addError = jest.fn();
    const error = new Error('classic histogram failed');

    renderHook(() => useToastSourceErrors([{ sourceId: 'v1', error }], { addError }, 'histogram'));

    expect(addError).toHaveBeenCalledWith(error, {
      title: 'Failed to fetch histogram data for v1 alerts',
    });
  });

  it.each<[EpisodeFetchErrorSurface, string]>([
    ['list', 'Failed to fetch alert episodes for custom alerts'],
    ['kpis', 'Failed to fetch KPIs for custom alerts'],
    ['histogram', 'Failed to fetch histogram data for custom alerts'],
  ])('names a custom source on the %s surface', (surface, expectedTitle) => {
    const addError = jest.fn();
    const error = new Error(`custom ${surface} failed`);

    renderHook(() => useToastSourceErrors([{ sourceId: 'custom', error }], { addError }, surface));

    expect(addError).toHaveBeenCalledWith(error, { title: expectedTitle });
  });

  it('does not toast 403 or 503 errors', () => {
    const addError = jest.fn();

    renderHook(() =>
      useToastSourceErrors(
        [
          { sourceId: 'v1', error: httpError(403, 'Forbidden') },
          { sourceId: 'v2', error: httpError(503, 'Unavailable') },
        ],
        { addError },
        'list'
      )
    );

    expect(addError).not.toHaveBeenCalled();
  });

  it('no-ops when toasts are omitted', () => {
    expect(() =>
      renderHook(() =>
        useToastSourceErrors([{ sourceId: 'v2', error: new Error('v2 failed') }], undefined, 'list')
      )
    ).not.toThrow();
  });

  it('toasts on every refetch while the error persists', () => {
    const addError = jest.fn();
    const { rerender } = renderHook(
      ({ errors }) => useToastSourceErrors(errors, { addError }, 'list'),
      { initialProps: { errors: [{ sourceId: 'v2', error: httpError(500, 'first') }] } }
    );

    rerender({ errors: [{ sourceId: 'v2', error: httpError(500, 'second') }] });

    expect(addError).toHaveBeenCalledTimes(2);
  });
});
