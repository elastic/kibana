import type { AppLeaveHandler } from '@kbn/core-application-browser';
export type OnAppLeave = (handler: AppLeaveHandler) => void;
declare const AppLeaveContext: import("react").Context<OnAppLeave | undefined>;
export declare const useAppLeave: () => OnAppLeave;
export { AppLeaveContext };
