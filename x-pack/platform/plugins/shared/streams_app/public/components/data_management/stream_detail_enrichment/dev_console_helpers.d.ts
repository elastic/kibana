import type { InteractiveModeSnapshot } from './state_management/interactive_mode_machine';
import type { SimulationActorSnapshot } from './state_management/simulation_state_machine';
/**
 * Type of suggestion that can be copied
 */
type SuggestionType = 'grok' | 'dissect' | 'pipeline';
/**
 * Data structure for copying suggestion and samples
 */
interface StreamsSuggestionData {
    raw_samples: unknown[];
    processed_samples: unknown[];
    suggestion: unknown;
    suggestionType: SuggestionType;
}
/**
 * Register a grok suggestion (called from grok suggestion component)
 */
export declare function registerGrokSuggestion(suggestion: unknown): void;
/**
 * Clear grok suggestion
 */
export declare function clearGrokSuggestion(): void;
/**
 * Register a dissect suggestion (called from dissect suggestion component)
 */
export declare function registerDissectSuggestion(suggestion: unknown): void;
/**
 * Clear dissect suggestion
 */
export declare function clearDissectSuggestion(): void;
/**
 * Creates a function that can be called from dev console to copy current suggestion state
 */
export declare function createCopyStreamsSuggestionHelper(getSimulationSnapshot: () => SimulationActorSnapshot, getInteractiveModeSnapshot: () => InteractiveModeSnapshot | null): () => StreamsSuggestionData | null;
/**
 * Install the dev console helper on the window object
 */
export declare function installDevConsoleHelpers(getSimulationSnapshot: () => SimulationActorSnapshot, getInteractiveModeSnapshot: () => InteractiveModeSnapshot | null): void;
/**
 * Clean up dev console helpers
 */
export declare function cleanupDevConsoleHelpers(): void;
export {};
