import type { FC } from 'react';
import type { OpenInDiscover } from './use_open_in_discover';
interface Props {
    categoriesCount: number;
    selectedCategoriesCount: number;
    openInDiscover: OpenInDiscover;
}
export declare const TableHeader: FC<Props>;
export declare const OpenInDiscoverButtons: FC<{
    openInDiscover: OpenInDiscover;
    showText?: boolean;
}>;
export {};
