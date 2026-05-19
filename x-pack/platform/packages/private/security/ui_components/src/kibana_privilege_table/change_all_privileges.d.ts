import React, { Component } from 'react';
import type { KibanaPrivilege } from '@kbn/security-role-management-model';
interface Props {
    onChange: (privilege: string) => void;
    privileges: KibanaPrivilege[];
    disabled?: boolean;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class ChangeAllPrivilegesControl extends Component<Props, State> {
    state: {
        isPopoverOpen: boolean;
    };
    private getPrivilegeCopy;
    render(): React.JSX.Element;
    private onSelectPrivilege;
    private onButtonClick;
    private closePopover;
}
export {};
