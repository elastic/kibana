import React, { Component, type ReactNode } from 'react';
interface AttachmentRenderErrorBoundaryProps {
    children: ReactNode;
}
interface AttachmentRenderErrorBoundaryState {
    hasError: boolean;
}
/**
 * Isolates a single attachment renderer so a throw (including from a third-party
 * or embeddable renderer's effects) degrades to an inline callout instead of
 * unmounting the whole case view. React still logs the original error to the
 * console when it is caught here.
 */
export declare class AttachmentRenderErrorBoundary extends Component<AttachmentRenderErrorBoundaryProps, AttachmentRenderErrorBoundaryState> {
    static displayName: string;
    state: AttachmentRenderErrorBoundaryState;
    static getDerivedStateFromError(): {
        hasError: boolean;
    };
    render(): string | number | boolean | Iterable<React.ReactNode> | React.JSX.Element | null | undefined;
}
export {};
