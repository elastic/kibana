import React from 'react';
export interface PopoverItemsProps<T> {
    renderItem: (item: T, index: number, items: T[]) => React.JSX.Element;
    items: T[];
    popoverButtonTitle: string;
    popoverButtonIcon?: string;
    popoverTitle?: string;
    numberOfItemsToDisplay?: number;
    dataTestPrefix?: string;
    /**
     * When true, visible items wrap to multiple lines instead of clipping on overflow.
     * Defaults to false (single line + overflow hidden) for table-cell contexts.
     */
    wrapItems?: boolean;
}
/**
 * Component to render list of items in popover, which has a configurable number of display items by default
 * @param items - array of items to render
 * @param renderItem - render function that render item, arguments: item, index, items[]
 * @param popoverTitle - title of popover
 * @param popoverButtonTitle - title of popover button that triggers popover
 * @param popoverButtonIcon - icon of popover button that triggers popover
 * @param numberOfItemsToDisplay - number of items to render that are no in popover, defaults to 0
 * @param dataTestPrefix - data-test-subj prefix to apply to elements
 */
declare const PopoverItemsComponent: <T extends unknown>({ items, renderItem, popoverTitle, popoverButtonTitle, popoverButtonIcon, numberOfItemsToDisplay, dataTestPrefix, wrapItems, }: PopoverItemsProps<T>) => React.JSX.Element;
export declare const PopoverItems: typeof PopoverItemsComponent;
export {};
