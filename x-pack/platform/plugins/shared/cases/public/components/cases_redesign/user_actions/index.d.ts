import React from 'react';
import type { UserActionTreeProps } from '../../user_actions/types';
export type UserActionsProps = Omit<UserActionTreeProps, 'currentUserProfile' | 'caseConnectors' | 'userProfiles' | 'casesConfiguration'>;
export declare const UserActions: React.MemoExoticComponent<(props: UserActionsProps) => React.JSX.Element>;
