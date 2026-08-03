import React from 'react';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
interface ToolCallGroupProps {
    steps: ToolCallStepData[];
}
export declare const ToolCallGroup: React.FC<ToolCallGroupProps>;
export {};
