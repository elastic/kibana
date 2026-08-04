import React, { type ReactNode } from 'react';
export interface EmbeddableAccessBoundaryProps {
    children: ReactNode;
    onClose?: () => void;
}
export declare const EmbeddableAccessBoundary: React.FC<EmbeddableAccessBoundaryProps>;
