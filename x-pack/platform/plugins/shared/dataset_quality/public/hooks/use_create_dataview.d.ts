import type { DataView } from '@kbn/data-views-plugin/common';
interface UseCreateDataViewProps {
    indexPatternString: string | undefined;
}
export declare function useCreateDataView({ indexPatternString }: UseCreateDataViewProps): {
    dataView: DataView | undefined;
    loading: boolean;
};
export {};
