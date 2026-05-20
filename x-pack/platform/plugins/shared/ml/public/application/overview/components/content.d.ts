import React, { type FC } from 'react';
interface Props {
    createAnomalyDetectionJobDisabled: boolean;
    setAdLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
    setDfaLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}
export declare const OverviewContent: FC<Props>;
export {};
