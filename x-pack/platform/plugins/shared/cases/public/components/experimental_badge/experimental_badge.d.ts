import React from 'react';
import type { EuiBetaBadgeProps } from '@elastic/eui';
interface Props {
    icon?: boolean;
    size?: EuiBetaBadgeProps['size'];
    compact?: boolean;
    'data-test-subj'?: string;
}
export declare const ExperimentalBadge: React.NamedExoticComponent<Props>;
export {};
