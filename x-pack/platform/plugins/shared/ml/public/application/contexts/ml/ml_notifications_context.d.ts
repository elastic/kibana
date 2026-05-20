import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { NotificationsCountResponse } from '@kbn/ml-common-types/notifications';
export declare const MlNotificationsContext: React.Context<{
    notificationsCounts: NotificationsCountResponse;
    /** Timestamp of the latest notification checked by the user */
    lastCheckedAt: number | null;
    /** Holds the value used for the actual request */
    latestRequestedAt: number | null;
    setLastCheckedAt: (v: number) => void;
}>;
export declare const MlNotificationsContextProvider: FC<PropsWithChildren<unknown>>;
export declare function useMlNotifications(): {
    notificationsCounts: NotificationsCountResponse;
    /** Timestamp of the latest notification checked by the user */
    lastCheckedAt: number | null;
    /** Holds the value used for the actual request */
    latestRequestedAt: number | null;
    setLastCheckedAt: (v: number) => void;
};
