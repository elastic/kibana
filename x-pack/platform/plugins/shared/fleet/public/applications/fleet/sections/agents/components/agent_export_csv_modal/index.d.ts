import React from 'react';
export interface ExportField {
    field: string;
}
export interface ExportFieldWithDescription extends ExportField {
    description: string;
}
interface Props {
    onClose: () => void;
    onSubmit: (columns: ExportField[]) => void;
    agentCount: number;
}
export declare const AgentExportCSVModal: React.FunctionComponent<Props>;
export {};
