import { type FC } from 'react';
interface ItemFilterPopoverProps {
    dataTestSubj: string;
    disabled?: boolean;
    disabledApplyButton?: boolean;
    disabledApplyTooltipContent?: string;
    helpText: string;
    itemSearchAriaLabel: string;
    initialSkippedItems?: string[];
    popoverButtonTitle: string;
    selectedItemLimit?: number;
    uniqueItemNames: string[];
    onChange: (skippedItems: string[]) => void;
}
export declare const ItemFilterPopover: FC<ItemFilterPopoverProps>;
export {};
