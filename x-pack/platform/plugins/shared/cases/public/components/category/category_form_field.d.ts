import type { EuiFormRowProps } from '@elastic/eui';
import React from 'react';
interface Props {
    isLoading: boolean;
    availableCategories: string[];
    formRowProps?: Partial<EuiFormRowProps>;
}
export declare const CategoryFormField: React.NamedExoticComponent<Props>;
export {};
