import type { EuiBadgeProps } from '@elastic/eui';
import React from 'react';
import type { Space } from '../../common';
export type SpaceSolutionBadgeProps = Omit<EuiBadgeProps, 'iconType'> & {
    solution?: Space['solution'];
};
export declare const SpaceSolutionBadge: ({ solution, ...badgeProps }: SpaceSolutionBadgeProps) => React.JSX.Element;
