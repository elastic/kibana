import React from 'react';
import type { AccountType } from '../../../../common/types';
interface AccountBadgeProps {
    accountType?: AccountType;
    variant?: 'default' | 'flyout';
}
export declare const AccountBadge: React.FC<AccountBadgeProps>;
export {};
