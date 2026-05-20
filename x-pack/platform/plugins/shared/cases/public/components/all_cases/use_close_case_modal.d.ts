interface UseCloseCaseModalProps {
    canSyncCloseReasonToAlerts: boolean;
    onCloseCase: (closeReason?: string) => void;
}
interface UseCloseCaseModalReturnValue {
    openCloseCaseModal: () => void;
    closeCaseModal: JSX.Element | null;
}
export declare const useCloseCaseModal: ({ canSyncCloseReasonToAlerts, onCloseCase, }: UseCloseCaseModalProps) => UseCloseCaseModalReturnValue;
export {};
