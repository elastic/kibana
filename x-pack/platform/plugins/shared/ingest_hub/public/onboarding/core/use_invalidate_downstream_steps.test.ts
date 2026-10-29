/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInvalidateDownstreamSteps } from './use_invalidate_downstream_steps';

const DOWNSTREAM = ['service-settings', 'authenticate-and-deploy', 'detect-and-review'];

function render(selectedServiceIds: string[], markStepsIncomplete = jest.fn()) {
  return renderHook(
    ({ ids }: { ids: string[] }) =>
      useInvalidateDownstreamSteps({
        selectedServiceIds: ids,
        downstreamStepIds: DOWNSTREAM,
        markStepsIncomplete,
      }),
    { initialProps: { ids: selectedServiceIds } }
  );
}

describe('useInvalidateDownstreamSteps', () => {
  it('does not call markStepsIncomplete on first mount', () => {
    const fn = jest.fn();
    render(['s3', 'ec2'], fn);
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not call when rerendered with a new array of equal contents', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3', 'ec2'], fn);
    rerender({ ids: ['s3', 'ec2'] });
    expect(fn).not.toHaveBeenCalled();
  });

  it('does not call when rerendered with a reordered array', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3', 'ec2'], fn);
    rerender({ ids: ['ec2', 's3'] });
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls with downstream ids when a service is removed', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3', 'ec2'], fn);
    rerender({ ids: ['s3'] });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(DOWNSTREAM);
  });

  it('calls when a service is added', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3'], fn);
    rerender({ ids: ['s3', 'ec2'] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls only once across multiple rerenders with the same changed value', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3', 'ec2'], fn);
    rerender({ ids: ['s3'] });
    rerender({ ids: ['s3'] });
    rerender({ ids: ['s3'] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls when going from empty to non-empty', () => {
    const fn = jest.fn();
    const { rerender } = render([], fn);
    rerender({ ids: ['s3'] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls when going from non-empty to empty', () => {
    const fn = jest.fn();
    const { rerender } = render(['s3'], fn);
    rerender({ ids: [] });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
