/**
 * The set of Index Lifecycle Management (ILM) phases.
 */
export type IlmPhase = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';
/**
 * Canonical phase order.
 */
export declare const PHASE_ORDER: IlmPhase[];
/**
 * Short phase labels ("Hot", "Warm", …). Used in badges and summaries.
 */
export declare const PHASE_NAMES: Record<IlmPhase, string>;
/**
 * Full phase labels ("Hot phase", "Warm phase", …). Used in selects and the policy editor.
 */
export declare const PHASE_TITLES: Record<IlmPhase, string>;
/**
 * Short descriptions (one sentence). Used in the Streams app phase selector.
 */
export declare const PHASE_DESCRIPTIONS: Record<IlmPhase, string>;
/**
 * Long descriptions. Used in the ILM policy editor.
 */
export declare const PHASE_LONG_DESCRIPTIONS: Record<IlmPhase, string>;
export type PhaseColorMap = Record<IlmPhase, string>;
/**
 * Hook that resolves EUI-theme-aware colors for each data lifecycle phase.
 */
export declare const usePhaseColors: () => PhaseColorMap;
