import React from 'react';
interface Props {
    hasErrorsOrWarnings: boolean;
    isLoading: boolean;
    onClick: () => void;
}
export declare function ExpandButton({ hasErrorsOrWarnings, isLoading, onClick }: Props): React.JSX.Element;
export {};
