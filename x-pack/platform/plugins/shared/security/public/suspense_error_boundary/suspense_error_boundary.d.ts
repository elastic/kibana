import type { PropsWithChildren } from 'react';
import React, { Component } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
interface Props {
    notifications: NotificationsStart;
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
