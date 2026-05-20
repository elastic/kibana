import React from 'react';
export type StateTransitionTimeframeVariant = 'pending' | 'recovering';
interface StateTransitionTimeframeFieldProps {
    numberPrependLabel?: string;
    /** Which state transition field to bind to. Defaults to 'pending'. */
    variant?: StateTransitionTimeframeVariant;
}
export declare const StateTransitionTimeframeField: ({ numberPrependLabel, variant, }: StateTransitionTimeframeFieldProps) => React.JSX.Element;
export {};
