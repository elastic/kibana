import React from 'react';
import { SearchType } from '../types';
export interface QueryFormTypeProps {
    searchType: SearchType | null;
    onFormTypeSelect: (formType: SearchType | null) => void;
}
export declare const QueryFormTypeChooser: React.FC<QueryFormTypeProps>;
