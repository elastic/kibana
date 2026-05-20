import React from 'react';
export type StateTransitionCountVariant = 'pending' | 'recovering';
interface StateTransitionCountFieldProps {
    prependLabel?: string;
    /** Which state transition field to bind to. Defaults to 'pending'. */
    variant?: StateTransitionCountVariant;
}
export declare const StateTransitionCountField: ({ prependLabel, variant, }: StateTransitionCountFieldProps) => React.JSX.Element;
export {};
