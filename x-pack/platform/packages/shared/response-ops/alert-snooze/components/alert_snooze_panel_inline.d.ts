import React from 'react';
import type { AlertSnoozePayload } from './use_snooze_form';
export interface AlertSnoozePanelInlineProps {
    onApply: (payload: AlertSnoozePayload) => void;
    onBack: () => void;
    /** alert field names for the `field_change` condition dropdown. */
    fieldOptions?: string[];
    isLoadingFields?: boolean;
}
/**
 * The snooze form rendered inline inside the row actions popover, with a back
 * button that returns the user to the actions menu. Shares the same form logic
 * (`useSnoozeForm`) and body (`SnoozeFormBody`) as AlertSnoozePopover but without
 * its own EuiPopover wrapper.
 *
 * The hosting popover panel is the scroll container (it sets maxHeight +
 * overflowY:auto via panelStyle, so popper keeps it inside the viewport). The
 * header and footer here use position:sticky so they stay pinned while the form
 * body scrolls between them.
 */
export declare const AlertSnoozePanelInline: ({ onApply, onBack, fieldOptions, isLoadingFields, }: AlertSnoozePanelInlineProps) => React.JSX.Element;
