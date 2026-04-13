import React from 'react';
import { type EuiSelectOption } from '@elastic/eui';
import { type FilterCondition } from '@kbn/streamlang';
export declare const BooleanShorthandOperatorKeys: {
    readonly EQ_TRUE: "sh_eq_true";
    readonly EQ_FALSE: "sh_eq_false";
    readonly NEQ_TRUE: "sh_neq_true";
    readonly NEQ_FALSE: "sh_neq_false";
};
export declare const operatorOptions: EuiSelectOption[];
export interface OperatorSelectorProps {
    condition: FilterCondition;
    onConditionChange: (condition: FilterCondition) => void;
    disabled?: boolean;
    compressed?: boolean;
    dataTestSubj?: string;
}
/**
 * Operator selector responsible for rendering the operator dropdown, including
 * UI-only shorthand options for boolean literals, and applying the appropriate
 * updates to the provided condition.
 */
export declare const OperatorSelector: React.FC<OperatorSelectorProps>;
