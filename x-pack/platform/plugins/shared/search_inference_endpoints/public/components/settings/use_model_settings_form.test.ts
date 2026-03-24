/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useModelSettingsForm } from './use_model_settings_form';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import { useInferenceSettings, useSaveInferenceSettings } from '../../hooks/use_inference_settings';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';

jest.mock('../../hooks/use_registered_features');
jest.mock('../../hooks/use_inference_settings');

const mockUseRegisteredFeatures = useRegisteredFeatures as jest.Mock;
const mockUseInferenceSettings = useInferenceSettings as jest.Mock;
const mockUseSaveInferenceSettings = useSaveInferenceSettings as jest.Mock;
const mockSaveSettings = jest.fn();

const parentFeature: InferenceFeatureConfig = {
  featureId: 'search',
  featureName: 'Search',
  featureDescription: 'Search features',
  taskType: '',
  recommendedEndpoints: [],
};

const childFeature1: InferenceFeatureConfig = {
  featureId: 'child_1',
  parentFeatureId: 'search',
  featureName: 'Child 1',
  featureDescription: 'First child',
  taskType: 'chat_completion',
  recommendedEndpoints: ['endpoint-a', 'endpoint-b'],
};

const childFeature2: InferenceFeatureConfig = {
  featureId: 'child_2',
  parentFeatureId: 'search',
  featureName: 'Child 2',
  featureDescription: 'Second child',
  taskType: 'text_embedding',
  recommendedEndpoints: ['endpoint-c'],
};

const allFeatures = [parentFeature, childFeature1, childFeature2];

describe('useModelSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRegisteredFeatures.mockReturnValue({ features: allFeatures, isLoading: false });
    mockUseInferenceSettings.mockReturnValue({ data: undefined, isLoading: false });
    mockUseSaveInferenceSettings.mockReturnValue({ mutate: mockSaveSettings, isLoading: false });
  });

  it('groups features into sections by parentFeatureId', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.sections).toHaveLength(1);
    expect(result.current.sections[0].featureId).toBe('search');
    expect(result.current.sections[0].featureName).toBe('Search');
    expect(result.current.sections[0].children).toHaveLength(2);
  });

  it('initializes assignments from recommendedEndpoints when no saved data', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.assignments).toEqual({
      child_1: ['endpoint-a', 'endpoint-b'],
      child_2: ['endpoint-c'],
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('uses saved settings over recommendedEndpoints', () => {
    mockUseInferenceSettings.mockReturnValue({
      data: {
        data: {
          features: [{ feature_id: 'child_1', endpoints: [{ id: 'saved-1' }] }],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.assignments.child_1).toEqual(['saved-1']);
    expect(result.current.assignments.child_2).toEqual(['endpoint-c']);
  });

  it('falls back to recommendedEndpoints when saved data has empty endpoints', () => {
    mockUseInferenceSettings.mockReturnValue({
      data: {
        data: {
          features: [{ feature_id: 'child_1', endpoints: [] }],
        },
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.assignments.child_1).toEqual(['endpoint-a', 'endpoint-b']);
  });

  it('tracks isDirty when assignments change', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateEndpoints('child_1', ['endpoint-x']);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('isDirty returns false when reverted to defaults', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    act(() => {
      result.current.updateEndpoints('child_1', ['endpoint-x']);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.updateEndpoints('child_1', ['endpoint-a', 'endpoint-b']);
    });
    expect(result.current.isDirty).toBe(false);
  });

  it('save calls saveSettings with correct API format', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    act(() => {
      result.current.updateEndpoints('child_1', ['ep-1', 'ep-2']);
    });
    act(() => {
      result.current.save();
    });

    expect(mockSaveSettings).toHaveBeenCalledWith({
      features: expect.arrayContaining([
        { feature_id: 'child_1', endpoints: [{ id: 'ep-1' }, { id: 'ep-2' }] },
        { feature_id: 'child_2', endpoints: [{ id: 'endpoint-c' }] },
      ]),
    });
  });

  it('resetSection restores recommendedEndpoints and saves immediately', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    act(() => {
      result.current.updateEndpoints('child_1', ['custom-ep']);
    });

    act(() => {
      result.current.resetSection('search');
    });

    expect(result.current.assignments.child_1).toEqual(['endpoint-a', 'endpoint-b']);
    expect(result.current.assignments.child_2).toEqual(['endpoint-c']);
    expect(mockSaveSettings).toHaveBeenCalledTimes(1);
  });

  it('resetSection does nothing for unknown section', () => {
    const { result } = renderHook(() => useModelSettingsForm());

    act(() => {
      result.current.resetSection('nonexistent');
    });

    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  it('falls back to parent recommendedEndpoints when child has none', () => {
    const childWithNoRecommended: InferenceFeatureConfig = {
      ...childFeature2,
      recommendedEndpoints: [],
    };
    mockUseRegisteredFeatures.mockReturnValue({
      features: [parentFeature, childFeature1, childWithNoRecommended],
      isLoading: false,
    });

    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.assignments.child_2).toEqual([]);
  });

  it('falls back to parent recommendedEndpoints when parent has them and child has none', () => {
    const parentWithEndpoints: InferenceFeatureConfig = {
      ...parentFeature,
      recommendedEndpoints: ['parent-ep'],
    };
    const childWithNoRecommended: InferenceFeatureConfig = {
      ...childFeature2,
      recommendedEndpoints: [],
    };
    mockUseRegisteredFeatures.mockReturnValue({
      features: [parentWithEndpoints, childFeature1, childWithNoRecommended],
      isLoading: false,
    });

    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.assignments.child_2).toEqual(['parent-ep']);
  });

  it('resetSection falls back to parent recommendedEndpoints when child has none', () => {
    const parentWithEndpoints: InferenceFeatureConfig = {
      ...parentFeature,
      recommendedEndpoints: ['parent-ep'],
    };
    const childWithNoRecommended: InferenceFeatureConfig = {
      ...childFeature2,
      recommendedEndpoints: [],
    };
    mockUseRegisteredFeatures.mockReturnValue({
      features: [parentWithEndpoints, childFeature1, childWithNoRecommended],
      isLoading: false,
    });

    const { result } = renderHook(() => useModelSettingsForm());

    act(() => {
      result.current.updateEndpoints('child_2', ['custom-ep']);
    });
    act(() => {
      result.current.resetSection('search');
    });

    expect(result.current.assignments.child_2).toEqual(['parent-ep']);
  });

  it('isLoading is true when any dependency is loading', () => {
    mockUseRegisteredFeatures.mockReturnValue({ features: [], isLoading: true });
    const { result } = renderHook(() => useModelSettingsForm());

    expect(result.current.isLoading).toBe(true);
  });
});
