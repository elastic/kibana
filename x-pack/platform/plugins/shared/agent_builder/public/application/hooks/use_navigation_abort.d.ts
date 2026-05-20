import type { OnAppLeave } from '../context/app_leave_context';
interface UseNavigationAbortParams {
    onAppLeave: OnAppLeave;
    isResponseLoading: boolean;
    cancelAll: () => void;
}
/**
 * Hook that handles navigation abort confirmation when user tries to navigate away
 * while one or more chat streams are in progress.
 *
 * If the user confirms, every in-flight stream is cancelled before the platform
 * proceeds with navigation. If the user cancels, they stay on the page and the
 * streams continue.
 */
export declare const useNavigationAbort: ({ onAppLeave, isResponseLoading, cancelAll, }: UseNavigationAbortParams) => void;
export {};
