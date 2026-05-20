import type { AppThunkAction } from '../types';
export declare const permissionsLoading: import("redux-actions").ActionFunction1<boolean, import("redux-actions").Action<boolean>>;
export declare const permissionsSuccess: import("redux-actions").ActionFunction1<boolean, import("redux-actions").Action<boolean>>;
export declare const permissionsError: import("redux-actions").ActionFunction1<unknown, import("redux-actions").Action<unknown>>;
export declare const loadPermissions: () => AppThunkAction<Promise<void>>;
