/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { EndpointEfforts } from '../../types';
import { useRecommendedDefaults } from './use_recommended_defaults';

describe('useRecommendedDefaults', () => {
  const onEndpointsChange = jest.fn();
  const onEffortsChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderRecommendedDefaults = ({
    endpointIds = ['ep-1'],
    effectiveRecommendedEndpoints = ['ep-1'],
    efforts = {},
    effectiveRecommendedEfforts = {},
    regionDeniedEndpointIds = new Set<string>(),
  }: Partial<{
    endpointIds: string[];
    effectiveRecommendedEndpoints: string[];
    efforts: EndpointEfforts;
    effectiveRecommendedEfforts: EndpointEfforts;
    regionDeniedEndpointIds: ReadonlySet<string>;
  }> = {}) =>
    renderHook(
      ({ discardVersion }: { discardVersion: number }) =>
        useRecommendedDefaults({
          featureId: 'test_feature',
          endpointIds,
          effectiveRecommendedEndpoints,
          efforts,
          effectiveRecommendedEfforts,
          regionDeniedEndpointIds,
          onEndpointsChange,
          onEffortsChange,
          discardVersion,
        }),
      { initialProps: { discardVersion: 0 } }
    );

  it('uses recommended defaults when the models and efforts match the recommended ones', () => {
    const { result } = renderRecommendedDefaults({
      efforts: { 'ep-1': 'low' },
      effectiveRecommendedEfforts: { 'ep-1': 'low' },
    });

    expect(result.current.isUsingRecommendedDefaults).toBe(true);
  });

  it('does not use recommended defaults when the models differ from the recommended ones', () => {
    const { result } = renderRecommendedDefaults({ endpointIds: ['ep-2'] });

    expect(result.current.isUsingRecommendedDefaults).toBe(false);
  });

  it('turns the recommended defaults toggle off when the effort differs from the recommended one', () => {
    const { result } = renderRecommendedDefaults({
      efforts: { 'ep-1': 'high' },
      effectiveRecommendedEfforts: { 'ep-1': 'low' },
    });

    expect(result.current.isUsingRecommendedDefaults).toBe(false);
  });

  it('turns off recommended defaults when every recommended model is denied by region policy', () => {
    const { result } = renderRecommendedDefaults({
      regionDeniedEndpointIds: new Set(['ep-1']),
    });

    expect(result.current.hasAvailableRecommendedEndpoints).toBe(false);
    expect(result.current.isUsingRecommendedDefaults).toBe(false);
  });

  it('opens the disable modal when toggling off', () => {
    const { result } = renderRecommendedDefaults();

    act(() => result.current.toggleRecommendedDefaults(false));

    expect(result.current.isDisableModalOpen).toBe(true);
    expect(onEndpointsChange).not.toHaveBeenCalled();
  });

  it('opens the reset modal when toggling on while customized', () => {
    const { result } = renderRecommendedDefaults({ endpointIds: ['ep-2'] });

    act(() => result.current.toggleRecommendedDefaults(true));

    expect(result.current.isResetModalOpen).toBe(true);
    expect(onEndpointsChange).not.toHaveBeenCalled();
  });

  it('does not open the reset modal when toggling on while already using recommended defaults', () => {
    const { result } = renderRecommendedDefaults();

    act(() => result.current.toggleRecommendedDefaults(true));

    expect(result.current.isResetModalOpen).toBe(false);
  });

  it('seeds the list without denied models and leaves recommended defaults when turning them off', () => {
    const { result } = renderRecommendedDefaults({
      endpointIds: ['ep-1', 'ep-2', 'ep-3'],
      effectiveRecommendedEndpoints: ['ep-1', 'ep-2', 'ep-3'],
      regionDeniedEndpointIds: new Set(['ep-2']),
    });

    act(() => result.current.toggleRecommendedDefaults(false));
    act(() => result.current.confirmDisableRecommendedDefaults());

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1', 'ep-3']);
    expect(result.current.isDisableModalOpen).toBe(false);
    expect(result.current.isUsingRecommendedDefaults).toBe(false);
  });

  it('resets efforts to the recommended ones with the recommended endpoints', () => {
    const { result } = renderRecommendedDefaults({
      efforts: { 'ep-1': 'high' },
      effectiveRecommendedEfforts: { 'ep-1': 'low' },
    });

    act(() => result.current.toggleRecommendedDefaults(true));
    act(() => result.current.confirmResetToDefaults());

    expect(onEndpointsChange).toHaveBeenCalledWith('test_feature', ['ep-1']);
    expect(onEffortsChange).toHaveBeenCalledWith('test_feature', { 'ep-1': 'low' });
    expect(result.current.isResetModalOpen).toBe(false);
  });

  it('closes the disable modal without changing the models', () => {
    const { result } = renderRecommendedDefaults();

    act(() => result.current.toggleRecommendedDefaults(false));
    expect(result.current.isDisableModalOpen).toBe(true);

    act(() => result.current.closeDisableModal());

    expect(result.current.isDisableModalOpen).toBe(false);
    expect(onEndpointsChange).not.toHaveBeenCalled();
  });

  it('closes the reset modal without changing the models', () => {
    const { result } = renderRecommendedDefaults({ endpointIds: ['ep-2'] });

    act(() => result.current.toggleRecommendedDefaults(true));
    expect(result.current.isResetModalOpen).toBe(true);

    act(() => result.current.closeResetModal());

    expect(result.current.isResetModalOpen).toBe(false);
    expect(onEndpointsChange).not.toHaveBeenCalled();
  });

  it('leaves custom mode when unsaved changes are discarded', () => {
    const { result, rerender } = renderRecommendedDefaults();

    act(() => result.current.confirmDisableRecommendedDefaults());
    expect(result.current.isUsingRecommendedDefaults).toBe(false);

    rerender({ discardVersion: 1 });

    expect(result.current.isUsingRecommendedDefaults).toBe(true);
  });
});
