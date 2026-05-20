import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { Logger } from '@kbn/logging';
interface HandleErrorDeps {
    toasts: NotificationsStart['toasts'];
    logger: Logger;
}
export declare const handleApiError: (error: any, deps: HandleErrorDeps) => void;
export {};
