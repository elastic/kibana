import React from 'react';
import type { EuiPageSectionProps, EuiPageSidebarProps } from '@elastic/eui';
export declare function StreamsAppPageTemplate({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare namespace StreamsAppPageTemplate {
    var Header: React.FunctionComponent<import("@elastic/eui").EuiPageHeaderProps>;
    var EmptyPrompt: React.FunctionComponent<import("@elastic/eui/src/components/page_template/empty_prompt/page_empty_prompt")._EuiPageEmptyPromptProps>;
    var Sidebar: ({ children, ...props }: EuiPageSidebarProps & {
        children: React.ReactNode;
    }) => React.JSX.Element;
    var Body: ({ noPadding, grow, ...props }: EuiPageSectionProps & {
        noPadding?: boolean;
        grow?: boolean;
    }) => React.JSX.Element;
}
