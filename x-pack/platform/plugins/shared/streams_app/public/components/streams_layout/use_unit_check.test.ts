/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { useUnitCheck, type UnitCheck } from './use_unit_check';

jest.mock('../../hooks/use_kibana');

const createHttpError = (statusCode: number): Error =>
  Object.assign(new Error(`Request failed with ${statusCode}`), {
    request: {},
    body: { statusCode, message: `Request failed with ${statusCode}`, error: 'Error' },
  });

const renderUnitCheck = (unitId: string) => {
  const statuses: UnitCheck[] = [];
  const rendered = renderHook(
    ({ id }: { id: string }) => {
      const status = useUnitCheck(id);
      statuses.push(status);
      return status;
    },
    { initialProps: { id: unitId } }
  );
  return { ...rendered, statuses };
};

describe('useUnitCheck', () => {
  let fetch: jest.Mock;

  beforeEach(() => {
    fetch = jest.fn();
    jest.mocked(useKibana).mockReturnValue({
      dependencies: { start: { streams: { streamsRepositoryClient: { fetch } } } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('does not request the default unit', () => {
    const { statuses } = renderUnitCheck('default');

    expect(statuses[0]).toBe('ready');
    expect(statuses.every((status) => status === 'ready')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('treats an id outside the unit id grammar as not found without a request', () => {
    const { statuses } = renderUnitCheck('Default');

    expect(statuses[0]).toBe('notFound');
    expect(statuses.every((status) => status === 'notFound')).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('checks other units with GET unit', async () => {
    fetch.mockResolvedValue({ unit: {}, ui_metadata: {} });
    const { result, statuses } = renderUnitCheck('edge');

    expect(statuses[0]).toBe('checking');
    await waitFor(() => expect(result.current).toBe('ready'));
    expect(fetch).toHaveBeenCalledWith('GET /internal/streams/unit/{id}', {
      params: { path: { id: 'edge' } },
      signal: expect.any(AbortSignal),
    });
  });

  it('reports a missing unit as not found', async () => {
    fetch.mockRejectedValue(createHttpError(404));
    const { result } = renderUnitCheck('edge');

    await waitFor(() => expect(result.current).toBe('notFound'));
  });

  it('lets the tabs handle any other error', async () => {
    fetch.mockRejectedValue(createHttpError(500));
    const { result, statuses } = renderUnitCheck('edge');

    await waitFor(() => expect(result.current).toBe('ready'));
    expect(statuses).not.toContain('notFound');
  });

  it.each([
    ['found', () => Promise.resolve({ unit: {}, ui_metadata: {} })],
    ['missing', () => Promise.reject(createHttpError(404))],
  ])(
    'does not reuse an earlier %s result when coming back to a unit',
    async (_label, firstLookup) => {
      fetch.mockImplementationOnce(firstLookup);
      const { result, rerender } = renderUnitCheck('edge');
      await waitFor(() => expect(result.current).not.toBe('checking'));

      fetch.mockReturnValue(new Promise(() => {}));
      rerender({ id: 'other' });
      rerender({ id: 'edge' });

      expect(result.current).toBe('checking');
    }
  );

  it('never reports the new unit as ready from the previous lookup', async () => {
    fetch.mockResolvedValue({ unit: {}, ui_metadata: {} });
    const { result, rerender, statuses } = renderUnitCheck('edge');
    await waitFor(() => expect(result.current).toBe('ready'));

    fetch.mockReturnValue(new Promise(() => {}));
    const rendersBefore = statuses.length;
    rerender({ id: 'other' });

    expect(statuses.slice(rendersBefore)).not.toContain('ready');
  });
});
