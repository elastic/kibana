import React from 'react';
import type { CreateToolResponse } from '../../../../../common/http_api/tools';
interface ToolCreateFlyoutProps {
    onClose: () => void;
    onToolCreated?: (tool: CreateToolResponse) => void;
}
export declare const ToolCreateFlyout: React.FC<ToolCreateFlyoutProps>;
export {};
