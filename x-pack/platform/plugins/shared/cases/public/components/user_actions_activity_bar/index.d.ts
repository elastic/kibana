import React from 'react';
import type { UserActivityParams } from './types';
import type { CaseUserActionsStats } from '../../containers/types';
interface UserActionsActivityProps {
    isLoading?: boolean;
    params: UserActivityParams;
    userActionsStats?: CaseUserActionsStats;
    onUserActionsActivityChanged: (params: UserActivityParams) => void;
}
export declare const UserActionsActivityBar: React.NamedExoticComponent<UserActionsActivityProps>;
export {};
