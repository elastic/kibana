import type { CustomDurationState } from '../components/types';
export interface DurationValidation {
    isDurationInvalid: boolean;
    isPastDateTime: boolean;
    isDateTimeMissing: boolean;
}
export declare const validateDuration: (duration: CustomDurationState | null) => DurationValidation;
/**
 * Converts a CustomDurationState to an ISO end-date string.
 * Returns null when duration is null, or when datetime mode has no date selected.
 */
export declare const computeEndDate: (duration: CustomDurationState | null) => string | null;
