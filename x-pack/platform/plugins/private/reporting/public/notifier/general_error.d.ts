import type { CoreStart, ToastInput } from '@kbn/core/public';
export declare const getGeneralErrorToast: (errorText: string, err: Error, core: CoreStart) => ToastInput;
