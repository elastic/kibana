import { type FC } from 'react';
import { type IconType } from '@elastic/eui';
interface TableActionButtonProps {
    iconType: IconType;
    dataTestSubjPostfix: string;
    isDisabled: boolean;
    label: string;
    tooltipText?: string;
    onClick: () => void;
}
export declare const TableActionButton: FC<TableActionButtonProps>;
export {};
