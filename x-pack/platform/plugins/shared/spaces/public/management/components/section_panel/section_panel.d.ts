import type { IconType } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { Component } from 'react';
interface Props {
    iconType?: IconType;
    title?: string | ReactNode;
    dataTestSubj?: string;
}
export declare class SectionPanel extends Component<React.PropsWithChildren<Props>, {}> {
    render(): React.JSX.Element;
    getTitle: () => React.JSX.Element | null;
    getForm: () => React.JSX.Element;
}
export {};
