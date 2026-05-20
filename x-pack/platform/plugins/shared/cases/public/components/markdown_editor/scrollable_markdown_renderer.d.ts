import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
export declare const getContentWrapperCss: (euiTheme: EuiThemeComputed<{}>) => import("@emotion/react").SerializedStyles;
export declare const ScrollableMarkdown: React.MemoExoticComponent<{
    ({ content }: {
        content: string;
    }): React.JSX.Element;
    displayName: string;
}>;
