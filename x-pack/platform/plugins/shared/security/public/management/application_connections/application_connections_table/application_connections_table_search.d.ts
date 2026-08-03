import type { EuiSearchBarProps } from '@elastic/eui';
import type { ApplicationConnection, ApplicationConnections } from '../constants/types';
export interface UseApplicationConnectionsTableSearchOptions {
    toolsLeft?: EuiSearchBarProps['toolsLeft'];
}
interface ApplicationConnectionsTableSearchBase {
    searchConfig: EuiSearchBarProps;
}
export interface GroupedApplicationConnectionsTableSearch extends ApplicationConnectionsTableSearchBase {
    viewMode: 'grouped';
    results: ApplicationConnections[];
}
export interface ListApplicationConnectionsTableSearch extends ApplicationConnectionsTableSearchBase {
    viewMode: 'list';
    results: ApplicationConnection[];
}
export type ApplicationConnectionsTableSearch = GroupedApplicationConnectionsTableSearch | ListApplicationConnectionsTableSearch;
export declare const useApplicationConnectionsTableSearch: ({ toolsLeft, }?: UseApplicationConnectionsTableSearchOptions) => ApplicationConnectionsTableSearch;
export {};
