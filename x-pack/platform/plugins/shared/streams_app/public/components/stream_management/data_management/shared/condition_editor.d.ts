import type { Condition } from '@kbn/streamlang';
import type { RoutingStatus } from '@kbn/streams-schema';
import React from 'react';
import type { Suggestion } from './autocomplete_selector';
export interface ConditionEditorProps {
    condition: Condition;
    status: RoutingStatus;
    onConditionChange: (condition: Condition) => void;
    onValidityChange: (isValid: boolean) => void;
    fieldSuggestions?: Suggestion[];
    valueSuggestions?: Suggestion[];
}
export declare function ConditionEditor(props: ConditionEditorProps): React.JSX.Element;
