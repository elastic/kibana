import type { IconType } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { Component } from 'react';
interface Props {
    iconType?: IconType;
    title: string | ReactNode;
    initiallyCollapsed?: boolean;
}
interface State {
    collapsed: boolean;
}
export declare class CollapsiblePanel extends Component<React.PropsWithChildren<Props>, State> {
    state: {
        collapsed: boolean;
    };
    constructor(props: Props);
    render(): React.JSX.Element;
    getTitle: () => React.JSX.Element;
    getForm: () => React.JSX.Element | null;
    toggleCollapsed: () => void;
}
export {};
