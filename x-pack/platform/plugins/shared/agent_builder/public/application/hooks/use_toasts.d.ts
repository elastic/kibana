import type { ToastInput } from '@kbn/core/public';
export declare const useToasts: () => {
    addSuccessToast: (input: ToastInput) => void;
    addErrorToast: (input: ToastInput) => void;
};
