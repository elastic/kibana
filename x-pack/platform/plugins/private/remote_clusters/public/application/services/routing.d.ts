import type { ScopedHistory } from '@kbn/core/public';
export declare function setUserHasLeftApp(userHasLeftApp: boolean): void;
export declare function getUserHasLeftApp(): boolean;
export interface AppRouter {
    history: ScopedHistory;
    route: {
        location: ScopedHistory['location'];
    };
}
export declare function registerRouter(reactRouter: AppRouter): void;
export declare function getRouter(): AppRouter;
