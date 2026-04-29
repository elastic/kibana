/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';
import { renderHook } from '@testing-library/react';
import { useDefaultConnector } from './use_default_connector';

const createConnector = (id: string, isPreconfigured = false): AIConnector =>
  ({
    id,
    name: id,
    isPreconfigured,
    isMissingSecrets: false,
    actionTypeId: '.gen-ai',
    secrets: {},
    isDeprecated: false,
    isSystemAction: false,
    config: {},
    isConnectorTypeDeprecated: false,
  } as AIConnector);

describe('useDefaultConnector', () => {
  it('returns GenAI default when set and available', () => {
    const connectors = [
      createConnector('Anthropic-Claude-Sonnet-4-5', true),
      createConnector('custom'),
    ];
    const { result } = renderHook(() =>
      useDefaultConnector({
        connectors,
        defaultConnectorId: 'custom',
      })
    );
    expect(result.current).toBe('custom');
  });

  it('returns first recommended connector when no GenAI default and recommended available', () => {
    const connectors = [
      createConnector('Google-Gemini-2-5-Pro'),
      createConnector('Anthropic-Claude-Sonnet-4-5'),
    ];
    const { result } = renderHook(() =>
      useDefaultConnector({ connectors, defaultConnectorId: undefined })
    );
    expect(result.current).toBe('Anthropic-Claude-Sonnet-4-5');
  });

  it('returns first preconfigured connector when no GenAI default and no recommended', () => {
    const connectors = [
      createConnector('custom-connector'),
      createConnector('Google-Gemini-2-5-Pro', true),
    ];
    const { result } = renderHook(() =>
      useDefaultConnector({ connectors, defaultConnectorId: undefined })
    );
    expect(result.current).toBe('Google-Gemini-2-5-Pro');
  });

  it('returns first connector when no preconfigured and no default', () => {
    const connectors = [createConnector('custom-1'), createConnector('custom-2')];
    const { result } = renderHook(() =>
      useDefaultConnector({ connectors, defaultConnectorId: undefined })
    );
    expect(result.current).toBe('custom-1');
  });
});
