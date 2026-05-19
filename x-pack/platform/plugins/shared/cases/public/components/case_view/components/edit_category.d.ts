import React from 'react';
export interface EditCategoryProps {
    isLoading: boolean;
    onSubmit: (category: string | null) => void;
    category?: string | null;
}
export declare const EditCategory: React.MemoExoticComponent<({ isLoading, onSubmit, category }: EditCategoryProps) => React.JSX.Element>;
