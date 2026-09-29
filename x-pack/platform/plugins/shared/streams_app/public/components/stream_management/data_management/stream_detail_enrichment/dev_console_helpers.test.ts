/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import {
  registerGrokSuggestion,
  clearGrokSuggestion,
  registerDissectSuggestion,
  clearDissectSuggestion,
  createCopyStreamsSuggestionHelper,
} from './dev_console_helpers';
import type { InteractiveModeSnapshot } from './state_management/interactive_mode_machine';
import type { SimulationActorSnapshot } from './state_management/simulation_state_machine';

// Mock the EUI functions
vi.mock('@elastic/eui', async () => {
  const mocked = {
    ...(await vi.importActual('@elastic/eui')),
    copyToClipboard: vi.fn(() => true),
  };
  return { ...mocked, default: mocked };
});

describe('dev_console_helpers', () => {
  // Suppress console logs during tests
  // eslint-disable-next-line no-console
  const originalLog = console.log;
  // eslint-disable-next-line no-console
  const originalError = console.error;

  beforeEach(() => {
    clearGrokSuggestion();
    clearDissectSuggestion();
    // eslint-disable-next-line no-console
    console.log = vi.fn();
    // eslint-disable-next-line no-console
    console.error = vi.fn();
  });

  afterEach(() => {
    // eslint-disable-next-line no-console
    console.log = originalLog;
    // eslint-disable-next-line no-console
    console.error = originalError;
  });

  describe('registerGrokSuggestion', () => {
    it('should register and retrieve grok suggestion', () => {
      const mockGrokSuggestion = {
        grokProcessor: { patterns: ['%{IP:ip}'] },
        simulationResult: { parsed_rate: 0.95 },
      };

      registerGrokSuggestion(mockGrokSuggestion);

      const mockSimulationSnapshot = {
        context: {
          samples: [{ message: 'test' }],
        },
      } as unknown as SimulationActorSnapshot;

      const mockInteractiveModeSnapshot = null;

      const copyFn = createCopyStreamsSuggestionHelper(
        () => mockSimulationSnapshot,
        () => mockInteractiveModeSnapshot
      );

      const result = copyFn();

      expect(result).toMatchObject({
        suggestionType: 'grok',
        suggestion: mockGrokSuggestion,
      });
    });
  });

  describe('registerDissectSuggestion', () => {
    it('should register and retrieve dissect suggestion', () => {
      const mockDissectSuggestion = {
        dissectProcessor: { pattern: '%{field1} %{field2}' },
        simulationResult: { parsed_rate: 0.9 },
      };

      registerDissectSuggestion(mockDissectSuggestion);

      const mockSimulationSnapshot = {
        context: {
          samples: [{ message: 'test' }],
        },
      } as unknown as SimulationActorSnapshot;

      const mockInteractiveModeSnapshot = null;

      const copyFn = createCopyStreamsSuggestionHelper(
        () => mockSimulationSnapshot,
        () => mockInteractiveModeSnapshot
      );

      const result = copyFn();

      expect(result).toMatchObject({
        suggestionType: 'dissect',
        suggestion: mockDissectSuggestion,
      });
    });
  });

  describe('pipeline suggestion priority', () => {
    it('should prioritize pipeline suggestion over grok', () => {
      const mockGrokSuggestion = { grokProcessor: { patterns: ['%{IP:ip}'] } };
      const mockPipelineSuggestion = { steps: [{ action: 'grok' }] };

      registerGrokSuggestion(mockGrokSuggestion);

      const mockSimulationSnapshot = {
        context: {
          samples: [{ message: 'test' }],
        },
      } as unknown as SimulationActorSnapshot;

      const mockInteractiveModeSnapshot = {
        context: {
          suggestedPipeline: mockPipelineSuggestion,
        },
      } as unknown as InteractiveModeSnapshot;

      const copyFn = createCopyStreamsSuggestionHelper(
        () => mockSimulationSnapshot,
        () => mockInteractiveModeSnapshot
      );

      const result = copyFn();

      expect(result).toMatchObject({
        suggestionType: 'pipeline',
        suggestion: mockPipelineSuggestion,
      });
    });
  });

  describe('no suggestion available', () => {
    it('should return data with null suggestion when no suggestion is registered', () => {
      const mockSimulationSnapshot = {
        context: {
          samples: [{ message: 'test' }],
        },
      } as unknown as SimulationActorSnapshot;

      const mockInteractiveModeSnapshot = null;

      const copyFn = createCopyStreamsSuggestionHelper(
        () => mockSimulationSnapshot,
        () => mockInteractiveModeSnapshot
      );

      const result = copyFn();

      expect(result).toMatchObject({
        suggestionType: 'pipeline',
        suggestion: null,
      });
    });
  });
});
