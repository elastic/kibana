import React from 'react';
interface ErrorBoundaryProps {
    children: JSX.Element;
    onError?: (error: Error) => void;
}
interface ErrorBoundaryState {
    originalError?: Error;
}
export declare class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: {
        originalError: undefined;
    };
    static getDerivedStateFromError(error: Error): {
        originalError: Error;
    };
    componentDidCatch(error: Error): void;
    static getDerivedStateFromProps(): {
        originalError: undefined;
    };
    render(): React.JSX.Element;
}
export {};
