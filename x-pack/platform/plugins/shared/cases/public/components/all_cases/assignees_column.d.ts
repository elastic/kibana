import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../common/ui/types';
export interface AssigneesColumnProps {
    assignees: CaseUI['assignees'];
    userProfiles: Map<string, UserProfileWithAvatar>;
    compressedDisplayLimit?: number;
}
export declare const AssigneesColumn: React.NamedExoticComponent<AssigneesColumnProps>;
