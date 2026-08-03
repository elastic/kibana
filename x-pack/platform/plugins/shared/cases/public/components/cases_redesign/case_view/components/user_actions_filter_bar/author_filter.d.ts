import React from 'react';
export declare const AUTHOR_FILTER_ID = "userActionsAuthor";
interface AuthorFilterProps {
    caseId: string;
    isLoading?: boolean;
    authors?: string[];
    onAuthorsChange: (authors: string[]) => void;
}
/**
 * Multi-selection author filter dropdown (mirroring `TypeFilter` /
 * `SortFilter`). Selected authors are OR'd together server-side by the
 * user_actions `_find` `authors` query param.
 */
export declare const AuthorFilter: React.NamedExoticComponent<AuthorFilterProps>;
export {};
