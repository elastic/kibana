import React from 'react';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';
export interface HeaderProps {
    maxWidth?: number | string;
    leftColumn?: JSX.Element;
    rightColumn?: JSX.Element;
    rightColumnGrow?: EuiFlexItemProps['grow'];
    topContent?: JSX.Element;
    tabs?: Array<Omit<EuiTabProps, 'name'> & {
        name?: JSX.Element | string;
    }>;
    tabsCss?: string;
    'data-test-subj'?: string;
}
export declare const Header: React.FC<HeaderProps>;
