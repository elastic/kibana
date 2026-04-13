import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { DownsamplePhase } from './types';
type PhaseName = 'hot' | 'warm' | 'cold' | 'frozen' | 'delete';
type MinAgePhase = Exclude<PhaseName, 'hot'>;
type IlmValidationFunc<V = unknown> = ValidationFunc<any, string, V>;
export declare const requiredMinAgeValue: (phase: MinAgePhase) => IlmValidationFunc;
export declare const ifExistsNumberNonNegative: IlmValidationFunc;
export declare const minAgeMustBeInteger: (phase: MinAgePhase) => IlmValidationFunc;
/**
 * Mirrors ILM editor behavior: ensure min_age for a phase is >= previous phases min_age.
 * Uses `_meta.<phase>.minAgeToMilliSeconds` computed values and formats the current values
 * for display in error messages.
 */
export declare const minAgeGreaterThanPreviousPhase: (phase: "cold" | "frozen" | "delete") => IlmValidationFunc;
export declare const requiredDownsampleIntervalValue: (phase: DownsamplePhase) => IlmValidationFunc;
export declare const ifExistsNumberGreaterThanZero: (phase: DownsamplePhase) => IlmValidationFunc;
export declare const downsampleIntervalMustBeInteger: (phase: DownsamplePhase) => IlmValidationFunc;
export declare const downsampleIntervalMultipleOfPreviousOne: (phase: "warm" | "cold") => IlmValidationFunc;
export declare const requiredSearchableSnapshotRepository: IlmValidationFunc;
export {};
