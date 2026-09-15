/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useToastSourceErrors } from './use_toast_source_errors';
import {
  EPISODES_HISTOGRAM_FETCH_ERROR_TOAST_TITLE,
  EPISODES_HISTOGRAM_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_V2_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_V2_FETCH_ERROR_TOAST_TITLE,
} from './translations';

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status } });

describe('useToastSourceErrors', () => {
  it('toasts a v2 list 500 with a v2 list title', () => {
    const addError = jest.fn();
    const error = new Error('v2 failed');

    renderHook(() =>
      useToastSourceErrors([{ sourceId: 'alerting-v2', error }], { addError }, 'list')
    );

    expect(addError).toHaveBeenCalledTimes(1);
    expect(addError).toHaveBeenCalledWith(error, {
      title: EPISODES_LIST_V2_FETCH_ERROR_TOAST_TITLE,
    });
  });

  it('toasts a classic list 500 with a v1 list title', () => {
    const addError = jest.fn();
    const error = new Error('classic failed');

    renderHook(() =>
      useToastSourceErrors([{ sourceId: 'classic-alerts', error }], { addError }, 'list')
    );

    expect(addError).toHaveBeenCalledWith(error, {
      title: EPISODES_LIST_V1_FETCH_ERROR_TOAST_TITLE,
    });
  });

  it('toasts KPI errors with source-specific titles', () => {
    const addError = jest.fn();
    const classicError = new Error('classic kpis failed');
    const v2Error = new Error('v2 kpis failed');

    renderHook(() =>
      useToastSourceErrors(
        [
          { sourceId: 'classic-alerts', error: classicError },
          { sourceId: 'alerting-v2', error: v2Error },
        ],
        { addError },
        'kpis'
      )
    );

    expect(addError).toHaveBeenCalledTimes(2);
    expect(addError).toHaveBeenNthCalledWith(1, classicError, {
      title: EPISODES_KPIS_V1_FETCH_ERROR_TOAST_TITLE,
    });
    expect(addError).toHaveBeenNthCalledWith(2, v2Error, {
      title: EPISODES_KPIS_V2_FETCH_ERROR_TOAST_TITLE,
    });
  });

  it('toasts histogram errors with a v1 histogram title', () => {
    const addError = jest.fn();
    const error = new Error('classic histogram failed');

    renderHook(() =>
      useToastSourceErrors([{ sourceId: 'classic-alerts', error }], { addError }, 'histogram')
    );

    expect(addError).toHaveBeenCalledWith(error, {
      title: EPISODES_HISTOGRAM_V1_FETCH_ERROR_TOAST_TITLE,
    });
  });

  it('falls back to a surface-named title for unknown source ids', () => {
    const addError = jest.fn();
    const listError = new Error('unknown list failed');
    const kpisError = new Error('unknown kpis failed');
    const histogramError = new Error('unknown histogram failed');

    renderHook(() =>
      useToastSourceErrors([{ sourceId: 'custom-source', error: listError }], { addError }, 'list')
    );
    renderHook(() =>
      useToastSourceErrors([{ sourceId: 'custom-source', error: kpisError }], { addError }, 'kpis')
    );
    renderHook(() =>
      useToastSourceErrors(
        [{ sourceId: 'custom-source', error: histogramError }],
        { addError },
        'histogram'
      )
    );

    expect(addError).toHaveBeenNthCalledWith(1, listError, {
      title: EPISODES_LIST_FETCH_ERROR_TOAST_TITLE,
    });
    expect(addError).toHaveBeenNthCalledWith(2, kpisError, {
      title: EPISODES_KPIS_FETCH_ERROR_TOAST_TITLE,
    });
    expect(addError).toHaveBeenNthCalledWith(3, histogramError, {
      title: EPISODES_HISTOGRAM_FETCH_ERROR_TOAST_TITLE,
    });
  });

  it('does not toast 403 or 503 errors', () => {
    const addError = jest.fn();

    renderHook(() =>
      useToastSourceErrors(
        [
          { sourceId: 'classic-alerts', error: httpError(403, 'Forbidden') },
          { sourceId: 'alerting-v2', error: httpError(503, 'Unavailable') },
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
        useToastSourceErrors(
          [{ sourceId: 'alerting-v2', error: new Error('v2 failed') }],
          undefined,
          'list'
        )
      )
    ).not.toThrow();
  });
});
