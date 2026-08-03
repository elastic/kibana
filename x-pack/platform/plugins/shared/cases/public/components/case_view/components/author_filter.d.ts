import React from 'react';
import type { CaseUI } from '../../../../common';
export declare const AUTHOR_FILTER_ID = "author";
interface AuthorFilterProps {
    caseData: CaseUI;
    isLoading?: boolean;
    selectedAuthors: string[];
    onAuthorsChange: (selectedAuthors: string[]) => void;
}
export declare const AuthorFilter: React.NamedExoticComponent<AuthorFilterProps>;
export {};
