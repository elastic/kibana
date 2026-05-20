import React from 'react';
export interface Props {
    onClick: () => void;
    renderButtonAsLink?: boolean;
}
export declare const AddProcessorButton: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLButtonElement>>;
