import type { Suggestion } from '../components/data_management/shared/autocomplete_selector';
/**
 * Hook for providing field suggestions from enrichment simulation data - to be used with Enrichment only
 *
 * When condition filtering is active and no documents match the condition,
 * falls back to all samples to ensure field suggestions are always available.
 */
export declare const useEnrichmentFieldSuggestions: () => Suggestion[];
/**
 * Hook for providing field suggestions from routing samples data - to be used with Routing only
 */
export declare const useRoutingFieldSuggestions: () => Suggestion[];
