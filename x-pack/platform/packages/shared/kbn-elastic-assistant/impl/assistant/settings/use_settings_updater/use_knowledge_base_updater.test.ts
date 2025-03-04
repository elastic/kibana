/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useKnowledgeBaseUpdater } from './use_knowledge_base_updater';
import { AssistantTelemetry } from '../../../..';

describe('useKnowledgeBaseUpdater', () => {
  const mockSetKnowledgeBase = jest.fn();
  const mockReportAssistantSettingToggled = jest.fn();
  const assistantTelemetryMock = {
    reportAssistantSettingToggled: mockReportAssistantSettingToggled,
  } as unknown as AssistantTelemetry;

  const initialKnowledgeBase = {
    latestAlerts: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with the provided knowledgeBase', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    expect(result.current.knowledgeBaseSettings).toEqual(initialKnowledgeBase);
  });

  it('should update knowledgeBaseSettings', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    act(() => {
      result.current.setUpdatedKnowledgeBaseSettings({ latestAlerts: 10 });
    });

    expect(result.current.knowledgeBaseSettings).toEqual({ latestAlerts: 10 });
  });

  it('should reset knowledgeBaseSettings to the initial value', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    act(() => {
      result.current.setUpdatedKnowledgeBaseSettings({ latestAlerts: 10 });
    });

    act(() => {
      result.current.resetKnowledgeBaseSettings();
    });

    expect(result.current.knowledgeBaseSettings).toEqual(initialKnowledgeBase);
  });

  it('should save knowledgeBaseSettings and call setKnowledgeBase', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    act(() => {
      result.current.setUpdatedKnowledgeBaseSettings({ latestAlerts: 10 });
    });

    act(() => {
      const saved = result.current.saveKnowledgeBaseSettings();
      expect(saved).toBe(true);
    });

    expect(mockSetKnowledgeBase).toHaveBeenCalledWith({ latestAlerts: 10 });
  });

  it('should report setting toggled when latestAlerts changes', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    act(() => {
      result.current.setUpdatedKnowledgeBaseSettings({ latestAlerts: 10 });
    });

    act(() => {
      result.current.saveKnowledgeBaseSettings();
    });

    expect(mockReportAssistantSettingToggled).toHaveBeenCalledWith({
      alertsCountUpdated: true,
    });
  });

  it('should not report setting toggled when latestAlerts does not change', () => {
    const { result } = renderHook(() =>
      useKnowledgeBaseUpdater({
        assistantTelemetry: assistantTelemetryMock,
        knowledgeBase: initialKnowledgeBase,
        setKnowledgeBase: mockSetKnowledgeBase,
      })
    );

    act(() => {
      result.current.saveKnowledgeBaseSettings();
    });

    expect(mockReportAssistantSettingToggled).not.toHaveBeenCalled();
  });
});
