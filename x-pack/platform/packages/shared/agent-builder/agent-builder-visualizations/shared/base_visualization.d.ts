import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { type InlineRenderCallbacks } from '@kbn/agent-builder-browser/attachments';
import type { VisualizationServices } from '../services';
interface BaseVisualizationProps {
    services: VisualizationServices;
    lensInput: TypedLensByValueInput | undefined;
    setLensInput: (input: TypedLensByValueInput) => void;
    isLoading: boolean;
    registerActionButtons: InlineRenderCallbacks['registerActionButtons'];
    height?: number;
}
export declare function BaseVisualization({ services, lensInput, setLensInput, isLoading, registerActionButtons, height, }: BaseVisualizationProps): React.JSX.Element;
export {};
