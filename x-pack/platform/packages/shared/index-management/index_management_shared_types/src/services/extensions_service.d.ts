import type { FunctionComponent, ReactNode } from 'react';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EuiBadgeProps } from '@elastic/eui';
import type { IndexDetailsTab } from '../home_sections';
import type { Index } from '../types';
export interface IndexContent {
    renderContent: (args: {
        index: Index;
        getUrlForApp: ApplicationStart['getUrlForApp'];
    }) => ReturnType<FunctionComponent>;
}
export interface IndexToggle {
    matchIndex: (index: Index) => boolean;
    label: string;
    name: string;
}
export interface IndexBadge {
    matchIndex: (index: Index) => boolean;
    label: string;
    filterExpression?: string;
    color: EuiBadgeProps['color'];
}
export interface EmptyListContent {
    renderContent: (args: {
        createIndexButton: ReturnType<FunctionComponent>;
    }) => ReturnType<FunctionComponent>;
}
export interface IndicesListColumn {
    fieldName: string;
    label: string;
    order: number;
    render?: (index: Index) => ReactNode;
    sort?: (index: Index) => any;
}
export interface ExtensionsSetup {
    addAction(action: any): void;
    addBanner(banner: any): void;
    addFilter(filter: any): void;
    addBadge(badge: IndexBadge): void;
    addToggle(toggle: IndexToggle): void;
    addColumn(column: IndicesListColumn): void;
    setEmptyListContent(content: EmptyListContent): void;
    addIndexDetailsTab(tab: IndexDetailsTab): void;
    setIndexOverviewContent(content: IndexContent): void;
}
