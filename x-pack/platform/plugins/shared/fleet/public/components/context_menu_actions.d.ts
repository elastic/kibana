import React from 'react';
import type { EuiButtonProps } from '@elastic/eui/src/components/button/button';
import type { EuiContextMenuProps } from '@elastic/eui/src/components/context_menu/context_menu';
import type { EuiContextMenuPanelProps } from '@elastic/eui/src/components/context_menu/context_menu_panel';
type Props = {
    button?: {
        props: EuiButtonProps;
        children: JSX.Element;
    };
    isOpen?: boolean;
    isManaged?: boolean;
    onChange?: (isOpen: boolean) => void;
    'aria-label'?: string;
} & ({
    items: EuiContextMenuPanelProps['items'];
} | {
    panels: EuiContextMenuProps['panels'];
});
export declare const ContextMenuActions: React.NamedExoticComponent<Props>;
export {};
