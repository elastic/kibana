import React from 'react';
interface WorkflowErrorError {
    message: string;
    meta?: {
        workflow?: string;
    };
}
export interface WorkflowErrorProps {
    title: string;
    description: {
        id: string;
        defaultMessage: string;
    };
    error: WorkflowErrorError;
}
export declare const WorkflowError: React.FC<WorkflowErrorProps>;
export {};
