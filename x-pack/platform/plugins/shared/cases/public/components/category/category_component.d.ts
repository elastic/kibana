import React from 'react';
import type { CaseUI } from '../../../common/ui';
export type CategoryField = CaseUI['category'] | undefined;
export interface CategoryComponentProps {
    isLoading: boolean;
    onChange: (category: string | null) => void;
    availableCategories: string[];
    category?: string | null;
    isInvalid?: boolean;
}
export declare const CategoryComponent: React.FC<CategoryComponentProps>;
