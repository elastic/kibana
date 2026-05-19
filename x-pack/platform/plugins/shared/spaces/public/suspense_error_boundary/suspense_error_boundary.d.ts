import type { PropsWithChildren } from 'react';
import React, { Component } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
interface Props {
    notifications: NotificationsStart;
    /**
     * Whether or not to show a loading spinner while waiting for the child components to load.
     *
     * Default is true.
     */
    showLoadingSpinner?: boolean;
}
interface State {
    error: Error | null;
}
export declare class SuspenseErrorBoundary extends Component<PropsWithChildren<Props>, State> {
    state: State;
    static getDerivedStateFromError(error: Error): {
        error: Error;
    };
    componentDidCatch(error: Error): void;
    render(): React.JSX.Element | null;
}
export {};
