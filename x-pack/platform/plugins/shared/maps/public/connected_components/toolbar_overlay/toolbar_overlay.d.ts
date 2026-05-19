import React from 'react';
import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
export interface Props {
    addFilters?: ((filters: Filter[], actionId: string) => Promise<void>) | null;
    showToolsControl: boolean;
    getFilterActions?: () => Promise<Action[]>;
    getActionContext?: () => ActionExecutionContext;
    shapeDrawModeActive: boolean;
    pointDrawModeActive: boolean;
    showFitToBoundsButton: boolean;
    showTimesliderButton: boolean;
}
export declare function ToolbarOverlay(props: Props): React.JSX.Element;
