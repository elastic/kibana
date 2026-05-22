/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDefaultModelValidation } from './use_default_model_validation';
import { useConnectors } from './use_connectors';
import { NO_DEFAULT_MODEL } from '../../common/constants';

jest.mock('./use_connectors');

const mockUseConnectors = useConnectors as jest.Mock;

describe('useDefaultModelValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectors.mockReturnValue({ data: [], isLoading: false });
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
    mockUseConnectors.mockReturnValue({
      data: [{ connectorId: 'pre-1' }],
      isLoading: false,
    });

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
    mockUseConnectors.mockReturnValue({ data: undefined, isLoading: true });

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

  it('does not report an error when the selected model is deprecated with a future EOL date', () => {
    mockUseConnectors.mockReturnValue({
      data: [
        {
          connectorId: 'deprecated-model',
          metadata: { heuristics: { status: 'deprecated', end_of_life_date: '2027-01-01' } },
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'deprecated-model',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(true);
  });

  it('does not report an error when the selected model has no EOL date but is deprecated', () => {
    mockUseConnectors.mockReturnValue({
      data: [
        {
          connectorId: 'deprecated-no-date',
          metadata: { heuristics: { status: 'deprecated' } },
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'deprecated-no-date',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(true);
  });

  it('reports an error when the selected model has passed its end-of-life date', () => {
    mockUseConnectors.mockReturnValue({
      data: [
        {
          connectorId: 'eol-model',
          metadata: { heuristics: { end_of_life_date: '2024-01-01' } },
        },
      ],
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useDefaultModelValidation({
        enableAi: true,
        defaultModelId: 'eol-model',
        featureSpecificModels: true,
      })
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors[0]).toMatch(/end of life/i);
  });
});
