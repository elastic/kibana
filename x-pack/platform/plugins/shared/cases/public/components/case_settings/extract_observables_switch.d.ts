import React from 'react';
interface Props {
    /**
     * Whether the component is disabled
     */
    disabled: boolean;
    /**
     * Whether the auto extract observables setting is enabled
     */
    isEnabled: boolean;
    /**
     * Whether to show the label
     */
    showLabel?: boolean;
    /**
     * Callback when the switch is changed
     */
    onSwitchChange: (isOn: boolean) => void;
}
export declare const ExtractObservablesSwitch: React.NamedExoticComponent<Props>;
export {};
