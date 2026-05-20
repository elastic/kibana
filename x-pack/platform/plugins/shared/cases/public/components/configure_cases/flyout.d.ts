import React from 'react';
import type { FormHook, FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/types';
export interface FormState<T extends FormData = FormData, I extends FormData = T> {
    isValid: boolean | undefined;
    submit: FormHook<T, I>['submit'];
}
export interface FlyOutBodyProps<T extends FormData = FormData, I extends FormData = T> {
    onChange: (state: FormState<T, I>) => void;
}
export interface FlyoutProps<T extends FormData = FormData, I extends FormData = T> {
    disabled: boolean;
    isLoading: boolean;
    onCloseFlyout: () => void;
    onSaveField: (data: I) => void;
    renderHeader: () => React.ReactNode;
    children: ({ onChange }: FlyOutBodyProps<T, I>) => React.ReactNode;
}
export declare const CommonFlyout: {
    <T extends FormData = FormData, I extends FormData = T>({ onCloseFlyout, onSaveField, isLoading, disabled, renderHeader, children, }: FlyoutProps<T, I>): React.JSX.Element;
    displayName: string;
};
