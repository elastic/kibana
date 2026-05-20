import React from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { IndexPattern } from '@kbn/lens-common';
interface Props {
    fieldType: string;
    fieldName: string;
    indexPattern: IndexPattern;
    uiActions: UiActionsStart;
}
export declare function GeoFieldWorkspacePanel(props: Props): React.JSX.Element;
export {};
