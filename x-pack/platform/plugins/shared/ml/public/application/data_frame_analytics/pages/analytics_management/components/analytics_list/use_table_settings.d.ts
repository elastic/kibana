import type { Direction, EuiBasicTableProps, Pagination } from '@elastic/eui';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
export interface Criteria<T extends object> {
    page?: {
        index: number;
        size: number;
    };
    sort?: {
        field: keyof T;
        direction: Direction;
    };
}
export interface CriteriaWithPagination<T extends object> extends Criteria<T> {
    page: {
        index: number;
        size: number;
    };
}
interface UseTableSettingsReturnValue<T extends object, HidePagination extends boolean = false> {
    onTableChange: EuiBasicTableProps<T>['onChange'];
    pagination: HidePagination extends true ? Required<Omit<Pagination, 'showPerPageOptions'>> | boolean : Required<Omit<Pagination, 'showPerPageOptions'>>;
    sorting: {
        sort: {
            field: keyof T;
            direction: 'asc' | 'desc';
        };
    };
}
export declare function useTableSettings<TypeOfItem extends object>(totalItemCount: number, pageState: ListingPageUrlState, updatePageState: (update: Partial<ListingPageUrlState>) => void, hide: true): UseTableSettingsReturnValue<TypeOfItem, true>;
export declare function useTableSettings<TypeOfItem extends object>(totalItemCount: number, pageState: ListingPageUrlState, updatePageState: (update: Partial<ListingPageUrlState>) => void, hide?: false): UseTableSettingsReturnValue<TypeOfItem, false>;
export {};
