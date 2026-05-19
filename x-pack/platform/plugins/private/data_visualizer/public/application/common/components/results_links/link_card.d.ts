import type { FC } from 'react';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
export interface LinkCardProps {
    icon: EuiIconType | string;
    iconAreaLabel?: string;
    title: any;
    description: any;
    href?: string;
    onClick?: () => void;
    isDisabled?: boolean;
    'data-test-subj'?: string;
}
export declare const LinkCard: FC<LinkCardProps>;
