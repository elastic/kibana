import type { FC } from 'react';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
interface Props {
    isMlEnabledInSpace?: boolean;
    blockRefresh?: boolean;
    pageState: ListingPageUrlState;
    updatePageState: (update: Partial<ListingPageUrlState>) => void;
}
export declare const DataFrameAnalyticsList: FC<Props>;
export {};
