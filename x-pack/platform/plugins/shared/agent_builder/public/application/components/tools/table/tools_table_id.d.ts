import type { ToolDefinition } from '@kbn/agent-builder-common';
import React from 'react';
export interface ToolIdWithDescriptionProps {
    tool: ToolDefinition;
}
export declare const ToolIdWithDescription: ({ tool }: ToolIdWithDescriptionProps) => React.JSX.Element;
