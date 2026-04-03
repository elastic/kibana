/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { useEndpointActions } from './use_endpoint_actions';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;

const mockEndpoint = {
  inference_id: 'my-endpoint',
  task_type: 'sparse_embedding',
  service: 'elasticsearch',
  service_settings: {},
  task_settings: {},
} as InferenceInferenceEndpointInfo;

describe('useEndpointActions', () => {
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addDanger: mockAddDanger,
          },
        },
      },
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useEndpointActions());

    expect(result.current.showDeleteAction).toBe(false);
    expect(result.current.showInferenceFlyout).toBe(false);
    expect(result.current.selectedInferenceEndpoint).toBeUndefined();
  });

  describe('displayDeleteActionItem', () => {
    it('should set selected endpoint and show delete action', () => {
      const { result } = renderHook(() => useEndpointActions());

      act(() => {
        result.current.displayDeleteActionItem(mockEndpoint);
      });

      expect(result.current.selectedInferenceEndpoint).toBe(mockEndpoint);
      expect(result.current.showDeleteAction).toBe(true);
    });
  });

  describe('onCancelDeleteModal', () => {
    it('should clear selected endpoint and hide delete action', () => {
      const { result } = renderHook(() => useEndpointActions());

      act(() => {
        result.current.displayDeleteActionItem(mockEndpoint);
      });

      expect(result.current.showDeleteAction).toBe(true);

      act(() => {
        result.current.onCancelDeleteModal();
      });

      expect(result.current.selectedInferenceEndpoint).toBeUndefined();
      expect(result.current.showDeleteAction).toBe(false);
    });
  });

  describe('displayInferenceFlyout', () => {
    it('should set selected endpoint and show flyout', () => {
      const { result } = renderHook(() => useEndpointActions());

      act(() => {
        result.current.displayInferenceFlyout(mockEndpoint);
      });

      expect(result.current.selectedInferenceEndpoint).toBe(mockEndpoint);
      expect(result.current.showInferenceFlyout).toBe(true);
    });
  });

  describe('onCloseInferenceFlyout', () => {
    it('should clear selected endpoint and hide flyout', () => {
      const { result } = renderHook(() => useEndpointActions());

      act(() => {
        result.current.displayInferenceFlyout(mockEndpoint);
      });

      expect(result.current.showInferenceFlyout).toBe(true);

      act(() => {
        result.current.onCloseInferenceFlyout();
      });

      expect(result.current.selectedInferenceEndpoint).toBeUndefined();
      expect(result.current.showInferenceFlyout).toBe(false);
    });
  });

  describe('copyContent', () => {
    it('should copy inference id to clipboard and show success toast', async () => {
      const { result } = renderHook(() => useEndpointActions());

      await act(async () => {
        result.current.copyContent('my-endpoint');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my-endpoint');
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('my-endpoint'),
        })
      );
    });

    it('should show danger toast when clipboard write fails', async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('denied'));

      const { result } = renderHook(() => useEndpointActions());

      await act(async () => {
        result.current.copyContent('my-endpoint');
      });

      expect(mockAddDanger).toHaveBeenCalled();
    });
  });
});
