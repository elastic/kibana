import React from 'react';
import type { Condition } from '@kbn/streamlang';
export declare const ConditionPanel: ({ condition, keywordWrapper, }: {
    condition: Condition;
    keywordWrapper?: (children: React.ReactNode) => React.ReactNode;
}) => React.JSX.Element;
export declare const EditableConditionPanel: ({ condition, isEditingCondition, setCondition, onValidityChange, }: {
    condition: Condition;
    isEditingCondition: boolean;
    setCondition: (condition: Condition) => void;
    onValidityChange?: (isValid: boolean) => void;
}) => React.JSX.Element;
interface ConditionDisplayProps {
    condition: Condition;
    showKeyword?: boolean;
    keyword?: string;
    keywordWrapper?: (children: React.ReactNode) => React.ReactNode;
    prefix?: string;
}
export declare const ConditionDisplay: ({ condition, showKeyword, keyword, keywordWrapper, prefix, }: ConditionDisplayProps) => React.JSX.Element;
export {};
