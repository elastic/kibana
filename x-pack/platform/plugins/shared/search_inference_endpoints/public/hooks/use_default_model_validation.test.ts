/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultModelValidation } from './use_default_model_validation';
import { useConnectorExists } from './use_connector_exists';
import { NO_DEFAULT_MODEL } from '../../common/constants';

jest.mock('./use_connector_exists');

const mockUseConnectorExists = useConnectorExists as jest.Mock;

describe('useDefaultModelValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectorExists.mockReturnValue({ exists: true, loading: false });
  });

  it('is valid when AI features are disabled regardless of other fields', () => {
    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: false,
        defaultModelId: NO_DEFAULT_MODEL,
        featureSpecificModels: false,
      })
    );

    expect(result.current).toEqual({
      errors: [],
      isValid: true,
    });
  });

  it('is valid when AI is enabled and a real default model exists', () => {
    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'pre-1',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('is valid when AI is enabled, feature-specific models on, and no global default (recommendations-only)', () => {
    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: NO_DEFAULT_MODEL,
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('is invalid when AI is enabled, feature-specific models off, and no global default is selected', () => {
    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: NO_DEFAULT_MODEL,
        featureSpecificModels: false,
      })
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors[0]).toMatch(/Select a default model/);
  });

  it('reports connector-not-exist when the selected model is missing', () => {
    mockUseConnectorExists.mockReturnValue({ exists: false, loading: false });

    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'deleted-connector',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors[0]).toMatch(/model previously selected is not available/);
  });

  it('does not report connector-not-exist while the existence check is still loading', () => {
    mockUseConnectorExists.mockReturnValue({ exists: false, loading: true });

    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'maybe-deleted',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual([]);
  });
});
