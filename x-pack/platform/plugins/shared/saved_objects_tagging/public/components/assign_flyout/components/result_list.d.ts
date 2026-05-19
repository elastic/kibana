import type { FC } from 'react';
import type { AssignableObject } from '../../../../common/assignments';
import type { AssignmentOverrideMap, AssignmentStatusMap } from '../types';
export interface AssignFlyoutResultListProps {
    isLoading: boolean;
    results: AssignableObject[];
    initialStatus: AssignmentStatusMap;
    overrides: AssignmentOverrideMap;
    onChange: (newOverrides: AssignmentOverrideMap) => void;
}
export declare const AssignFlyoutResultList: FC<AssignFlyoutResultListProps>;
