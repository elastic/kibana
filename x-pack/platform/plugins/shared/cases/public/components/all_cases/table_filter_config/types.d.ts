import type { FilterOptions } from '../../../../common/ui';
export interface FilterConfigState {
    key: string;
    isActive: boolean;
}
export type FilterChangeHandler = (params: Partial<FilterOptions>) => void;
export interface FilterConfigRenderParams {
    filterOptions: FilterOptions;
}
export interface FilterConfig {
    key: string;
    label: string;
    isActive: boolean;
    isAvailable: boolean;
    getEmptyOptions: () => Partial<FilterOptions>;
    render: (params: FilterConfigRenderParams) => React.ReactNode;
}
