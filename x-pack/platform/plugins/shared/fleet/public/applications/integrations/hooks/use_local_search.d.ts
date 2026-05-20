import type { Search as LocalSearch } from 'js-search';
import type { PackageListItem } from '../types';
export declare const searchIdField = "id";
export declare const fieldsToSearch: string[];
export declare function useLocalSearch(packageList: Array<Pick<PackageListItem, 'id' | 'name' | 'title' | 'description'>>, isInitialLoading: boolean): LocalSearch | null;
