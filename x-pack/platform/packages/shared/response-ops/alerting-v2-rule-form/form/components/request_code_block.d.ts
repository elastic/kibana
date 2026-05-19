import React from 'react';
export type ShowRequestActivePage = 'create' | 'update';
interface RequestCodeBlockProps {
    activeTab: ShowRequestActivePage;
    ruleId?: string;
    'data-test-subj'?: string;
}
export declare const RequestCodeBlock: ({ activeTab, ruleId, "data-test-subj": dataTestSubj, }: RequestCodeBlockProps) => React.JSX.Element;
export {};
