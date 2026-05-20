import React from 'react';
import type { IconType, EuiIconProps } from '@elastic/eui';
/**
 * Recursive menu item interface that supports infinite nesting using EUI's ContextMenu component.
 * If `children` is provided, the item will render as a submenu trigger.
 * If `onClick` is provided (and no children), the item is an action.
 */
export interface MenuItem {
    /** Unique identifier for the menu item */
    id: string;
    /** Display name for the menu item */
    name: React.ReactNode;
    /** Icon to display (EUI icon type) */
    icon?: IconType;
    /** Color for the icon (e.g., 'danger' for destructive actions). Defaults to 'default' if not specified. */
    iconColor?: EuiIconProps['color'];
    /** Whether the item is disabled */
    disabled?: boolean;
    /** Click handler for action items (not used if children are present) */
    onClick?: (event: React.MouseEvent) => void;
    /** Nested menu items - if present, this item becomes a submenu trigger */
    children?: MenuItem[];
    /** Optional data-test-subj for testing */
    'data-test-subj'?: string;
    /** Title for the child panel (used for back navigation). If not provided, uses `name` */
    panelTitle?: string;
    /** If true, the menu will NOT close after clicking this item. Useful for items that open a secondary popover anchored to the menu item button. */
    keepMenuOpen?: boolean;
}
export interface HierarchicalActionsMenuProps {
    /** The menu items to render */
    items: MenuItem[];
    /** Whether the popover is open (controlled) */
    isOpen?: boolean;
    /** Where the popover should be anchored. Defaults to downRight. */
    anchorPosition?: 'downRight' | 'downLeft' | 'upRight' | 'upLeft';
    /** Callback when open state changes (controlled) */
    onToggle?: (isOpen: boolean) => void;
    /** Custom button configuration. If not provided, renders a default icon button */
    button?: {
        props?: {
            iconType?: IconType;
            iconSide?: 'left' | 'right';
            color?: 'primary' | 'text' | 'accent' | 'success' | 'warning' | 'danger';
            fill?: boolean;
            isLoading?: boolean;
        };
        children: React.ReactNode;
    };
    /** Optional data-test-subj for the button */
    'data-test-subj'?: string;
}
/**
 * A reusable hierarchical context menu component that supports infinite nesting.
 * Uses EUI's EuiContextMenu with slide-in panels for nested items.
 */
export declare const HierarchicalActionsMenu: React.FC<HierarchicalActionsMenuProps>;
