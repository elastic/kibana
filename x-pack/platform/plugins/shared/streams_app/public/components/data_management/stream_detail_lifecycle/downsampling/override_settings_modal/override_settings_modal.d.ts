import React from 'react';
export interface OverrideSettingsModalProps {
    onCancel: () => void;
    onSave: () => void;
}
export declare function OverrideSettingsModal({ onCancel, onSave }: OverrideSettingsModalProps): React.JSX.Element;
