import React from 'react';
interface AddStepProps {
    parentId?: string;
    mode: 'inline' | 'subdued' | 'prominent';
    nestingDisabled?: boolean;
}
export declare const CreateStepButton: React.FC<AddStepProps>;
export {};
