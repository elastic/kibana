import React from 'react';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
interface ToolCallStepProps {
    step: ToolCallStepData;
}
export declare const ToolCallStep: React.FC<ToolCallStepProps>;
export {};
