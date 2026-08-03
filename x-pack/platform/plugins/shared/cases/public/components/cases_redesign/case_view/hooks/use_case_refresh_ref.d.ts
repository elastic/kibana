import type { CaseViewProps } from '../../../case_view/types';
interface UseCaseRefreshRefArgs {
    refreshRef: CaseViewProps['refreshRef'];
    isLoading: boolean;
}
/**
 * Ported from the original CaseViewPage component.
 * Exposes a `refreshCase` callback via the provided ref so parent components
 * can imperatively trigger a case data refresh. Guards against calls when
 * the component is unmounted (isStale) or already loading.
 */
export declare const useCaseRefreshRef: ({ refreshRef, isLoading }: UseCaseRefreshRefArgs) => void;
export {};
