/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { copyToClipboard } from '@elastic/eui';
import type { InteractiveModeSnapshot } from './state_management/interactive_mode_machine';
import type { SimulationActorSnapshot } from './state_management/simulation_state_machine';
import {
  selectPreviewRecords,
  selectOriginalPreviewRecords,
} from './state_management/simulation_state_machine/selectors';

/**
 * Type of suggestion that can be copied
 */
type SuggestionType = 'grok' | 'dissect' | 'pipeline';

/**
 * Data structure for copying suggestion and samples
 */
interface StreamsSuggestionData {
  raw_samples: unknown[]; // Original input documents before processing
  processed_samples: unknown[]; // Documents after simulation processing
  suggestion: unknown;
  suggestionType: SuggestionType;
}

/**
 * Global registry for processor-level suggestions (grok, dissect)
 * These are set by the individual suggestion components
 */
interface GlobalSuggestionRegistry {
  grok?: unknown;
  dissect?: unknown;
}

const suggestionRegistry: GlobalSuggestionRegistry = {};

/**
 * Register a grok suggestion (called from grok suggestion component)
 */
export function registerGrokSuggestion(suggestion: unknown) {
  suggestionRegistry.grok = suggestion;
}

/**
 * Clear grok suggestion
 */
export function clearGrokSuggestion() {
  delete suggestionRegistry.grok;
}

/**
 * Register a dissect suggestion (called from dissect suggestion component)
 */
export function registerDissectSuggestion(suggestion: unknown) {
  suggestionRegistry.dissect = suggestion;
}

/**
 * Clear dissect suggestion
 */
export function clearDissectSuggestion() {
  delete suggestionRegistry.dissect;
}

/**
 * Creates a function that can be called from dev console to copy current suggestion state
 */
export function createCopyStreamsSuggestionHelper(
  getSimulationSnapshot: () => SimulationActorSnapshot,
  getInteractiveModeSnapshot: () => InteractiveModeSnapshot | null
) {
  return function copyStreamsSuggestion() {
    try {
      const simulationSnapshot = getSimulationSnapshot();
      const interactiveModeSnapshot = getInteractiveModeSnapshot();

      // Get both raw and processed samples from simulation state
      const rawSamples = selectOriginalPreviewRecords(simulationSnapshot.context).map(
        (sample) => sample.document
      );
      const processedSamples = selectPreviewRecords(simulationSnapshot.context);

      // Try to determine suggestion type and get suggestion data
      const suggestionData = extractSuggestionData(interactiveModeSnapshot);

      const data: StreamsSuggestionData = {
        raw_samples: rawSamples,
        processed_samples: processedSamples,
        suggestion: suggestionData?.suggestion ?? null,
        suggestionType: suggestionData?.type ?? 'pipeline',
      };

      // Copy to clipboard as JSON
      const jsonString = JSON.stringify(data, null, 2);
      const success = copyToClipboard(jsonString);

      if (success) {
        // eslint-disable-next-line no-console
        console.log('✅ Copied suggestion data to clipboard:', {
          suggestionType: data.suggestionType,
          hasSuggestion: data.suggestion !== null,
          rawSamplesCount: rawSamples.length,
          processedSamplesCount: processedSamples.length,
        });
        // eslint-disable-next-line no-console
        console.log('Preview (first 500 chars):', jsonString.substring(0, 500) + '...');
        // eslint-disable-next-line no-console
        console.log(
          '\n📝 To create an eval dataset from the copied data, run:\n' +
            '   pbpaste | node --require ./src/setup_node_env/ ./x-pack/platform/packages/shared/kbn-evals-suite-streams/scripts/create_dataset_from_clipboard.ts'
        );
      } else {
        // eslint-disable-next-line no-console
        console.error('❌ Failed to copy to clipboard');
      }

      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error copying streams suggestion:', error);
      return null;
    }
  };
}

/**
 * Extracts suggestion data from interactive mode state or global registry
 */
function extractSuggestionData(
  snapshot: InteractiveModeSnapshot | null
): { type: SuggestionType; suggestion: unknown } | null {
  // Priority 1: Check for pipeline suggestion in interactive mode state
  if (snapshot?.context.suggestedPipeline) {
    return {
      type: 'pipeline',
      suggestion: snapshot.context.suggestedPipeline,
    };
  }

  // Priority 2: Check for grok suggestion in global registry
  if (suggestionRegistry.grok) {
    return {
      type: 'grok',
      suggestion: suggestionRegistry.grok,
    };
  }

  // Priority 3: Check for dissect suggestion in global registry
  if (suggestionRegistry.dissect) {
    return {
      type: 'dissect',
      suggestion: suggestionRegistry.dissect,
    };
  }

  return null;
}

/**
 * Install the dev console helper on the window object
 */
export function installDevConsoleHelpers(
  getSimulationSnapshot: () => SimulationActorSnapshot,
  getInteractiveModeSnapshot: () => InteractiveModeSnapshot | null
) {
  if (typeof window !== 'undefined') {
    const copyFn = createCopyStreamsSuggestionHelper(
      getSimulationSnapshot,
      getInteractiveModeSnapshot
    );

    // Add to window object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).copyStreamsSuggestion = copyFn;
  }
}

/**
 * Clean up dev console helpers
 */
export function cleanupDevConsoleHelpers() {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).copyStreamsSuggestion;
  }
  // Clear any registered suggestions
  delete suggestionRegistry.grok;
  delete suggestionRegistry.dissect;
}
