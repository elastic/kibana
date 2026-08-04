import React from 'react';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
interface ToolCallStepHeadlineProps {
    step: ToolCallStepData;
    hasResults: boolean;
}
export declare const ToolCallStepHeadline: React.FC<ToolCallStepHeadlineProps>;
export {};
