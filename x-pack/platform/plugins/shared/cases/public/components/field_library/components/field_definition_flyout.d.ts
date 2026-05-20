import React from 'react';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
interface FieldDefinitionFlyoutProps {
    owner: string;
    fieldDefinition?: FieldDefinition;
    onSave: (params: {
        name: string;
        description: string;
        definition: string;
    }) => void;
    onClose: () => void;
    isSaving?: boolean;
}
export declare const FieldDefinitionFlyout: React.FC<FieldDefinitionFlyoutProps>;
export {};
