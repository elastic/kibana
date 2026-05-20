import type { FC, ReactNode } from 'react';
import type { ExpandablePanels } from '@kbn/ml-common-types/locator';
interface HeaderItem {
    id: string;
    label?: ReactNode;
    value: ReactNode;
}
export declare const HEADER_ITEMS_LOADING = "header_items_loading";
export interface ExpandableSectionProps {
    content: ReactNode;
    contentPadding?: boolean;
    docsLink?: ReactNode;
    headerItems?: HeaderItem[] | typeof HEADER_ITEMS_LOADING;
    isExpanded?: boolean;
    dataTestId: string;
    title: ReactNode;
    urlStateKey: ExpandablePanels;
}
export declare const ExpandableSection: FC<ExpandableSectionProps>;
export {};
