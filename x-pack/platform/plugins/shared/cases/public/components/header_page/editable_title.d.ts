import React from 'react';
export interface EditableTitleProps {
    isLoading: boolean;
    title: string;
    onSubmit: (title: string) => void;
}
export declare const EditableTitle: React.NamedExoticComponent<EditableTitleProps>;
