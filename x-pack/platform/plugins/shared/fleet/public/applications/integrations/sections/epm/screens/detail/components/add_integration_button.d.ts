import React from 'react';
export declare enum AddIntegrationButtonDisabledReason {
    VERSION_MISMATCH = "VERSION_MISMATCH",
    OUTDATED_VERSION = "OUTDATED_VERSION",
    MISSING_SECURITY = "MISSING_SECURITY",
    MISSING_PRIVILEGES = "MISSING_PRIVILEGES"
}
interface AddIntegrationButtonProps {
    disabledReason?: AddIntegrationButtonDisabledReason;
    packageName: string;
    href: string;
    onClick: Function;
}
export declare function AddIntegrationButton(props: AddIntegrationButtonProps): React.JSX.Element;
export {};
