import React from 'react';
export interface ReferencedContentFileCardProps {
    skillName: string;
    fileName: string;
    relativePath: string;
    content: string;
    onFileNameChange: (value: string) => void;
    onRelativePathChange: (value: string) => void;
    onContentChange: (value: string) => void;
    onFileNameBlur?: () => void;
    onRelativePathBlur?: () => void;
    onContentBlur?: () => void;
    fileNameError?: string;
    relativePathError?: string;
    contentError?: string;
    readOnly?: boolean;
}
export declare const ReferencedContentFileCard: React.FC<ReferencedContentFileCardProps>;
