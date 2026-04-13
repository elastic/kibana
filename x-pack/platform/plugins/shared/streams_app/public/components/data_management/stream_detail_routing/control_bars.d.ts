import React from 'react';
import type { RoutingDefinitionWithUIAttributes } from './types';
interface AddRoutingRuleControlsProps {
    isStreamNameValid: boolean;
}
export declare const AddRoutingRuleControls: ({ isStreamNameValid }: AddRoutingRuleControlsProps) => React.JSX.Element;
export declare const EditRoutingRuleControls: ({ routingRule, }: {
    routingRule: RoutingDefinitionWithUIAttributes;
}) => React.JSX.Element;
export declare const EditSuggestedRuleControls: ({ onSave, onAccept, conditionError, isStreamNameValid, }: {
    onSave?: () => void;
    onAccept: () => void;
    conditionError?: string;
    isStreamNameValid: boolean;
}) => React.JSX.Element;
export {};
