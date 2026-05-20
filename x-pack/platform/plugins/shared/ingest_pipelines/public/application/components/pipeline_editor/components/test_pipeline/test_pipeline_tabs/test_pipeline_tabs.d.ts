import React from 'react';
export type TestPipelineFlyoutTab = 'documents' | 'output';
interface Props {
    onTabChange: (tab: TestPipelineFlyoutTab) => void;
    selectedTab: TestPipelineFlyoutTab;
}
export declare const Tabs: React.FunctionComponent<Props>;
export {};
