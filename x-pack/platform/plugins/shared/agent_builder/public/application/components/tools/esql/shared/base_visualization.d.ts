import type { LensPublicStart } from '@kbn/lens-plugin/public';
import React from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { type InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
interface BaseVisualizationProps {
    lens: LensPublicStart;
    uiActions: UiActionsStart;
    lensInput: TypedLensByValueInput | undefined;
    setLensInput: (input: TypedLensByValueInput) => void;
    isLoading: boolean;
    registerActionButtons: InlineRenderCallbacks['registerActionButtons'];
}
export declare function BaseVisualization({ lens, uiActions, lensInput, setLensInput, isLoading, registerActionButtons, }: BaseVisualizationProps): React.JSX.Element;
export {};
