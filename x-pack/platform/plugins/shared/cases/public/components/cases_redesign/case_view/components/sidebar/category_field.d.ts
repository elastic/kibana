import React from 'react';
export interface CategoryFieldProps {
    category?: string | null;
    onSubmit: (category: string | null) => void;
    isLoading: boolean;
}
export declare const CategoryField: React.FC<CategoryFieldProps>;
