import React from 'react';
export interface ControlSliderProps {
    /** Allowed values to show on the Control Slider */
    values: Array<{
        label: string;
        value: number;
        accessibleLabel?: string;
    }>;
    /** Current value set */
    currentValue: number | undefined;
    /** When set will show the control in a disabled state */
    disabled?: boolean;
    /** An explanation for the disabled state of the control */
    disabledReason?: string;
    /** A way to pass the test id parameter */
    'data-test-subj'?: string;
    /** A callback for when the slider value changes */
    onChange: (newValue: number) => void;
}
export declare function ControlSlider({ values, currentValue, disabled, disabledReason, onChange, 'data-test-subj': dataTestSubj, }: ControlSliderProps): React.JSX.Element;
