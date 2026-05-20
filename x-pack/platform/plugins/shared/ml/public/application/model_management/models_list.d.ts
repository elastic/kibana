import type { ListingPageUrlState } from '@kbn/ml-url-state';
import type { FC } from 'react';
export declare const getDefaultModelsListState: () => ListingPageUrlState;
interface Props {
    pageState?: ListingPageUrlState;
    updatePageState?: (update: Partial<ListingPageUrlState>) => void;
}
export declare const ModelsList: FC<Props>;
export {};
