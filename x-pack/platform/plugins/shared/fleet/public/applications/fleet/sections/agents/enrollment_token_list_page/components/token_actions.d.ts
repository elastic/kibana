import React from 'react';
import type { EnrollmentAPIKey } from '../../../../types';
import type { MenuItem } from '../../components';
export type BulkAction = 'delete' | 'revoke';
export declare const Divider: React.FunctionComponent;
export declare const TokenActions: React.FunctionComponent<{
    apiKey: EnrollmentAPIKey;
    refresh: () => void;
}>;
export declare const getTokenActionItems: ({ onRevoke, onDelete, plural, revokeDisabled, }: {
    onRevoke: () => void;
    onDelete: () => void;
    plural?: boolean;
    revokeDisabled?: boolean;
}) => MenuItem[];
