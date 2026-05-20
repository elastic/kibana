import type { ReactElement } from 'react';
import React from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
export declare const EisKnowledgeBaseCallout: ({ children, isOpen, zIndex, anchorPosition, dismissCallout, }: {
    children: ReactElement;
    isOpen?: boolean;
    zIndex?: number;
    anchorPosition?: EuiTourStepProps["anchorPosition"];
    dismissCallout: () => void;
}) => React.JSX.Element;
