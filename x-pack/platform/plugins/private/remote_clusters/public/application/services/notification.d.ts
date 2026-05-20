import type { NotificationsSetup, FatalErrorsSetup } from '@kbn/core/public';
export declare let toasts: NotificationsSetup['toasts'];
export declare let fatalError: FatalErrorsSetup;
export declare function init(_toasts: NotificationsSetup['toasts'], _fatalError: FatalErrorsSetup): void;
