import type { EuiBasicTableProps, Pagination, PropertySort } from '@elastic/eui';
import type { DataVisualizerTableState } from '../../../../../common/types';
interface UseTableSettingsReturnValue<T extends object> {
    onTableChange: EuiBasicTableProps<T>['onChange'];
    pagination: Pagination;
    sorting: {
        sort: PropertySort;
    };
}
export declare function useTableSettings<TypeOfItem extends object>(items: TypeOfItem[], pageState: DataVisualizerTableState, updatePageState: (update: DataVisualizerTableState) => void, isEsql?: boolean): UseTableSettingsReturnValue<TypeOfItem>;
export {};
