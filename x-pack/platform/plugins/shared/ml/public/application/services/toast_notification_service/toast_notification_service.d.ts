import type { ToastInput, ToastOptions, ToastsStart } from '@kbn/core/public';
import { type ErrorType } from '@kbn/ml-error-utils';
export type ToastNotificationService = ReturnType<typeof toastNotificationServiceProvider>;
export declare function toastNotificationServiceProvider(toastNotifications: ToastsStart): {
    displayDangerToast: (toastOrTitle: ToastInput, options?: ToastOptions) => void;
    displayWarningToast: (toastOrTitle: ToastInput, options?: ToastOptions) => void;
    displaySuccessToast: (toastOrTitle: ToastInput, options?: ToastOptions) => void;
    displayErrorToast: (error: ErrorType, title?: string, toastLifeTimeMs?: number, toastMessage?: string) => void;
};
/**
 * Hook to use {@link ToastNotificationService} in React components.
 */
export declare function useToastNotificationService(): ToastNotificationService;
