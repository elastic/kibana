import type { ConversationRoundStep, ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
export type GroupedStep = {
    kind: 'step';
    step: ConversationRoundStep;
    index: number;
} | {
    kind: 'group';
    steps: ToolCallStep[];
};
export declare const groupSteps: (steps: ConversationRoundStep[]) => GroupedStep[];
