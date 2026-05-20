import React from 'react';
import type { FittingFunction, EndValue } from '@kbn/expression-xy-plugin/common';
export interface MissingValuesOptionProps {
    fittingFunction?: FittingFunction;
    onFittingFnChange: (newMode: FittingFunction) => void;
    emphasizeFitting?: boolean;
    onEmphasizeFittingChange: (emphasize: boolean) => void;
    endValue?: EndValue;
    onEndValueChange: (endValue: EndValue) => void;
    isFittingEnabled?: boolean;
}
export declare const MissingValuesOptions: React.FC<MissingValuesOptionProps>;
