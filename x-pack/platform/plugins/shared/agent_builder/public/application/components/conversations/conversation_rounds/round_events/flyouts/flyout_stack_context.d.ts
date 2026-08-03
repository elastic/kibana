import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
interface FlyoutStackContextValue {
    openToolStep: (step: ToolCallStep) => void;
}
export declare const FlyoutStackContext: import("react").Context<FlyoutStackContextValue | null>;
export declare const useFlyoutStack: () => FlyoutStackContextValue | null;
export {};
