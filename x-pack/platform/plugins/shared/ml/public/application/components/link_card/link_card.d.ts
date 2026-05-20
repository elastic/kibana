import type { FC, ReactElement } from 'react';
import type { IconType } from '@elastic/eui';
interface Props {
    icon: IconType | ReactElement;
    iconAreaLabel?: string;
    title: any;
    description: any;
    href?: string;
    onClick?: () => void;
    isDisabled?: boolean;
    'data-test-subj'?: string;
}
export declare const LinkCard: FC<Props>;
export {};
