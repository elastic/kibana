import React from 'react';
import type { ActionFormValue } from './types';
interface ActionFormProps {
    value: ActionFormValue;
    onChange: (next: ActionFormValue) => void;
    isInvalid?: boolean;
}
export declare const createInitialActionFormValue: () => ActionFormValue;
export declare const ActionForm: ({ value, onChange, isInvalid }: ActionFormProps) => React.JSX.Element;
export {};
