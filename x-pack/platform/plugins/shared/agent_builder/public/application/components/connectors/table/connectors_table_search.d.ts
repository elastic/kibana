import type { Search } from '@elastic/eui';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
export interface ConnectorsTableSearch {
    searchConfig: Search;
    results: ConnectorItem[];
}
export declare const useConnectorsTableSearch: () => ConnectorsTableSearch;
