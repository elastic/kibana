import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ApplicationConnection } from '../constants/types';
export interface ConnectionTableColumnsOptions {
    withClientNameColumn?: boolean;
}
export declare const useConnectionTableColumns: ({ withClientNameColumn, }?: ConnectionTableColumnsOptions) => Array<EuiBasicTableColumn<ApplicationConnection>>;
