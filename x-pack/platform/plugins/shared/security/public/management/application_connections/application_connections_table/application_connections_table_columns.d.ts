import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ApplicationConnections } from '../constants/types';
export interface UseApplicationConnectionsTableColumnsOptions {
    expandedRows: ReadonlySet<string>;
    onToggleExpand: (clientId: string) => void;
}
export declare const useApplicationConnectionsTableColumns: ({ expandedRows, onToggleExpand, }: UseApplicationConnectionsTableColumnsOptions) => Array<EuiBasicTableColumn<ApplicationConnections>>;
