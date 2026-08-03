interface Props {
    onConfirmationCallback: () => void;
}
export declare const useCancelCreationAction: ({ onConfirmationCallback }: Props) => {
    showConfirmationModal: boolean;
    onOpenModal: () => void;
    onConfirmModal: () => void;
    onCancelModal: () => void;
};
export {};
