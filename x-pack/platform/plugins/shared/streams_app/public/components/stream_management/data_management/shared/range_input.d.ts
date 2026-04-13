import React from 'react';
import type { RangeCondition } from '@kbn/streamlang';
import type { Suggestion } from './autocomplete_selector';
export interface RangeInputProps {
    value: RangeCondition;
    onChange: (value: RangeCondition) => void;
    valueSuggestions?: Suggestion[];
    disabled?: boolean;
    compressed?: boolean;
    dataTestSubj?: string;
}
/**
 * Range input component that allows users to specify a range with "from" and "to" values
 * selected from actual field values in the data.
 * Uses checkboxes to control whether boundaries are inclusive (gte/lte) or exclusive (gt/lt).
 */
export declare const RangeInput: React.FC<RangeInputProps>;
