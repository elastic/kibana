import React from 'react';
import { type McpClientDetailsData, type McpClientDetailsPresentation } from './mcp_client_details_content';
export interface McpClientDetailsProps {
    clientDetails: McpClientDetailsData;
    presentation: McpClientDetailsPresentation;
    onClose: () => void;
}
export declare const McpClientDetails: ({ clientDetails, presentation, onClose, }: McpClientDetailsProps) => React.JSX.Element;
