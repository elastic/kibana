import React from 'react';
interface Props {
    next: (model: string) => void;
    onSecurityChange: (model: string) => void;
    currentSecurityModel: string;
}
export declare const RemoteClusterSetupTrust: ({ next, currentSecurityModel, onSecurityChange, }: Props) => React.JSX.Element;
export {};
