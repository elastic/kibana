import React from 'react';
interface FormState {
    name: string;
    esqlQuery: string;
}
interface QueryStreamFlyoutProps {
    title: React.ReactNode;
    onClose: () => void;
    onSubmit: (formData: FormState, signal: AbortSignal) => Promise<void>;
    showNameField?: boolean;
    initialName?: string;
    initialEsql?: string;
    disableSubmitWhenLoading?: boolean;
}
export declare function QueryStreamFlyout({ title, onClose, onSubmit, showNameField, initialName, initialEsql, disableSubmitWhenLoading, }: QueryStreamFlyoutProps): React.JSX.Element;
export {};
