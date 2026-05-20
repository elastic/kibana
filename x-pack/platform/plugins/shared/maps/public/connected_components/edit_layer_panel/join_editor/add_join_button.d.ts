import React from 'react';
export interface Props {
    disabledReason: string;
    isDisabled: boolean;
    label: string;
    onClick: () => void;
}
export declare function AddJoinButton(props: Props): React.JSX.Element;
