import React from 'react';
export declare const FlyoutContextProvider: React.FunctionComponent<{
    children?: React.ReactNode;
}>;
export declare const useFlyoutContext: () => {
    isEnrollmentFlyoutOpen: boolean;
    openEnrollmentFlyout: () => void;
    closeEnrollmentFlyout: () => void;
    isFleetServerFlyoutOpen: boolean;
    openFleetServerFlyout: () => void;
    closeFleetServerFlyout: () => void;
};
