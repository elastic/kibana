import React from 'react';
import type { BulkImportMcpToolsFormData } from './types';
export interface BulkImportMcpToolsFormProps {
    formId: string;
    onSubmit: (data: BulkImportMcpToolsFormData) => void;
}
export declare const BulkImportMcpToolsForm: React.FC<BulkImportMcpToolsFormProps>;
