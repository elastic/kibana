import React from 'react';
import { type EuiFlyoutProps } from '@elastic/eui';
export interface FlyoutHeaderTab<TId extends string> {
    id: TId;
    label: string;
}
/** At least one tab so the flyout always has a valid selected tab id. */
export type NonEmptyFlyoutTabs<TId extends string> = readonly [
    FlyoutHeaderTab<TId>,
    ...FlyoutHeaderTab<TId>[]
];
export interface FlyoutWithTabsProps<TId extends string> {
    title: string;
    showBackButton?: boolean;
    onBack?: () => void;
    tabsAriaLabel: string;
    tabs: NonEmptyFlyoutTabs<TId>;
    initialTabId?: TId;
    onClose: () => void;
    size?: number;
    type?: EuiFlyoutProps['type'];
    children: (selectedTabId: TId) => React.ReactNode;
}
export declare const FlyoutWithTabs: <TId extends string>({ title, showBackButton, onBack, tabsAriaLabel, tabs, initialTabId, onClose, size, type, children, }: FlyoutWithTabsProps<TId>) => React.JSX.Element;
