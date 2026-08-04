import React from 'react';
export interface ExpandableContextMenuPanelProps {
    items: React.ReactElement[];
    'data-test-subj'?: string;
}
/**
 * Drop-in replacement for EuiContextMenuPanel inside the row actions popover.
 * A menu item can call openPanel() to swap the actions menu out for arbitrary
 * inline content (e.g. the inline snooze form); a back button inside that
 * content calls closePanel() to restore the menu. EuiPopover unmounts its panel
 * content when it closes, so the swapped content resets back to the menu on the
 * next open without any extra handling.
 *
 * The hosting EuiPopover is the scroll container (maxHeight + overflowY:auto via
 * panelStyle), so an inline form's sticky header/footer stay pinned while the
 * body scrolls and the panel remains inside the viewport.
 */
export declare const ExpandableContextMenuPanel: ({ items, "data-test-subj": testSubj, }: ExpandableContextMenuPanelProps) => React.JSX.Element;
