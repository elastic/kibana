import type { FC } from 'react';
export interface LinkCardProps {
    icon: any | string;
    iconAreaLabel?: string;
    title: any;
    description: any;
    href?: string;
    onClick?: () => void;
    isDisabled?: boolean;
    'data-test-subj'?: string;
}
export declare const LinkCard: FC<LinkCardProps>;
