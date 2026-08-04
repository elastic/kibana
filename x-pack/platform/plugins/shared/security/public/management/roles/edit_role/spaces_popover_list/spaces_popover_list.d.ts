import React, { Component } from 'react';
import type { SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { DisplaySpace } from '../privileges/kibana/display_space';
interface Props {
    spaces: DisplaySpace[];
    buttonText: string;
    spacesApiUi: SpacesApiUi;
}
interface State {
    allowSpacesListFocus: boolean;
    isPopoverOpen: boolean;
}
export declare class SpacesPopoverList extends Component<Props, State> {
    state: {
        allowSpacesListFocus: boolean;
        isPopoverOpen: boolean;
    };
    render(): React.JSX.Element;
    private getMenuPanel;
    private onButtonClick;
    private closePopover;
    private getSpaceOptions;
}
export {};
