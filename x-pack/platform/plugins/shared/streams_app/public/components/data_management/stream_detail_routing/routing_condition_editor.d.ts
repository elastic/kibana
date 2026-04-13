import type { RoutingDefinition } from '@kbn/streams-schema';
import React from 'react';
import type { ConditionEditorProps } from '../shared/condition_editor';
type RoutingConditionChangeParams = Omit<RoutingDefinition, 'destination'>;
export type RoutingConditionEditorProps = Omit<ConditionEditorProps, 'fieldSuggestions'> & {
    onStatusChange: (params: RoutingConditionChangeParams['status']) => void;
    isSuggestionRouting?: boolean;
};
export declare function RoutingConditionEditor(props: RoutingConditionEditorProps): React.JSX.Element;
export {};
