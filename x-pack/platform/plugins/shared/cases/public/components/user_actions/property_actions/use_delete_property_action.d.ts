interface Props {
    onDelete: () => void;
}
export declare const useDeletePropertyAction: ({ onDelete }: Props) => {
    showDeletionModal: boolean;
    onModalOpen: () => void;
    onConfirm: () => void;
    onCancel: () => void;
};
export {};
