import React from 'react';
import type { CustomDurationState } from './types';
export interface SnoozeDurationPickerProps {
    value: CustomDurationState;
    onChange: (update: Partial<CustomDurationState>) => void;
    isDurationInvalid?: boolean;
    isDateTimeInvalid?: boolean;
}
export declare const SnoozeDurationPicker: ({ value: { mode, value: durationValue, unit: durationUnit, dateTime }, onChange, isDurationInvalid, isDateTimeInvalid, }: SnoozeDurationPickerProps) => React.JSX.Element;
