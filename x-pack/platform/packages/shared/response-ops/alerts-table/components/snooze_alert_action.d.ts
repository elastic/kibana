import React from 'react';
import type { AdditionalContext, AlertActionsProps } from '../types';
/**
 * Alerts table row action for snoozing/unsnoozeing alerts.
 */
export declare const SnoozeAlertAction: <AC extends AdditionalContext = AdditionalContext>({ alert, refresh, onActionExecuted, }: AlertActionsProps<AC>) => React.JSX.Element | null;
