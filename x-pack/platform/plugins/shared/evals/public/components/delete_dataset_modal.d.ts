import React from 'react';
export interface DeleteDatasetModalProps {
    datasetId: string;
    datasetName: string;
    examplesCount: number;
    onClose: () => void;
    onDeleted?: () => void;
}
export declare const DeleteDatasetModal: React.FC<DeleteDatasetModalProps>;
