/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { useFormattedEOLDate } from './use_formatted_eol_date';

const makeMetadata = (
  overrides: NonNullable<EisInferenceEndpointMetadata['heuristics']>
): EisInferenceEndpointMetadata => ({
  heuristics: overrides,
});

describe('useFormattedEOLDate', () => {
  it('returns null when metadata is undefined', () => {
    const { result } = renderHook(() => useFormattedEOLDate(undefined));
    expect(result.current).toBeNull();
  });

  it('returns null when end_of_life_date is absent', () => {
    const { result } = renderHook(() => useFormattedEOLDate(makeMetadata({ status: 'ga' })));
    expect(result.current).toBeNull();
  });

  it('returns a formatted string when end_of_life_date is present', () => {
    const { result } = renderHook(() =>
      useFormattedEOLDate(makeMetadata({ end_of_life_date: '2026-04-15' }))
    );
    expect(typeof result.current).toBe('string');
    expect(result.current).not.toBeNull();
  });

  it('returns null when metadata has no heuristics', () => {
    const { result } = renderHook(() => useFormattedEOLDate({}));
    expect(result.current).toBeNull();
  });

  it('recomputes when metadata changes from undefined to a date', () => {
    const props: { metadata: EisInferenceEndpointMetadata | undefined } = { metadata: undefined };
    const { result, rerender } = renderHook(() => useFormattedEOLDate(props.metadata));

    expect(result.current).toBeNull();

    props.metadata = makeMetadata({ end_of_life_date: '2026-04-15' });
    rerender();

    expect(result.current).not.toBeNull();
  });

  it('recomputes when metadata changes from a date to undefined', () => {
    const props: { metadata: EisInferenceEndpointMetadata | undefined } = {
      metadata: makeMetadata({
        end_of_life_date: '2026-04-15',
      }),
    };
    const { result, rerender } = renderHook(() => useFormattedEOLDate(props.metadata));

    expect(result.current).not.toBeNull();

    props.metadata = undefined;
    rerender();

    expect(result.current).toBeNull();
  });
});
