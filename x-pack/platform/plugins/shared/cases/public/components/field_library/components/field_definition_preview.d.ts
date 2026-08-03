import type { FC } from 'react';
interface FieldDefinitionPreviewProps {
    definition: string;
    onDefaultChange: (fieldName: string, value: string, control: string) => void;
}
export declare const FieldDefinitionPreview: FC<FieldDefinitionPreviewProps>;
export {};
