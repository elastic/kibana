import type { SuggestionsProvider } from '../shared/suggestions/types';
import type { EvaluationDefinition, StatDefinition } from './form_types';
/**
 * Builds a suggestions provider offering the metric labels (stats + other evaluations)
 * available to reference from an evaluation expression, excluding the evaluation's own label
 * to avoid self-reference. Token filtering, prefix matching and selection handling are generic
 * and live in `createLabelSuggestionsProvider`.
 */
export declare const createMetricSuggestionsProvider: (stats: StatDefinition[], evaluations: EvaluationDefinition[], excludeLabel?: string) => SuggestionsProvider;
