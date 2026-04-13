import React from 'react';
export declare function StreamDeleteModal({ onClose, onDelete, onCancel, name, }: {
    onClose: () => void;
    onDelete: () => Promise<void>;
    onCancel: () => void;
    name: string;
}): React.JSX.Element;
