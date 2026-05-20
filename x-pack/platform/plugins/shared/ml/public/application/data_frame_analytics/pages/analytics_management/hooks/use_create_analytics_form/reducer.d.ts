import type { Action } from './actions';
import type { State } from './state';
export declare const mmlUnitInvalidErrorMessage: string;
/**
 * Returns the list of model memory limit errors based on validation result.
 * @param mmlValidationResult
 */
export declare function getModelMemoryLimitErrors(mmlValidationResult: any): string[] | null;
/**
 * Validates num_top_feature_importance_values. Must be an integer >= 0.
 */
export declare const validateNumTopFeatureImportanceValues: (numTopFeatureImportanceValues: any) => boolean;
export declare const validateAdvancedEditor: (state: State) => State;
/**
 * Validates provided MML isn't lower than the estimated one.
 */
export declare function validateMinMML(estimatedMml: string): (mml: string) => {
    min: {
        minValue: string;
        actualValue: string;
    };
} | null;
export declare function reducer(state: State, action: Action): State;
