import React, { Component, type ErrorInfo, type ReactNode } from 'react';
interface AttachmentRenderErrorBoundaryProps {
    children: () => ReactNode;
}
interface AttachmentRenderErrorBoundaryState {
    hasError: boolean;
}
export declare class AttachmentRenderErrorBoundary extends Component<AttachmentRenderErrorBoundaryProps, AttachmentRenderErrorBoundaryState> {
    state: AttachmentRenderErrorBoundaryState;
    static getDerivedStateFromError(): {
        hasError: boolean;
    };
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    render(): React.JSX.Element;
}
export {};
