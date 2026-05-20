import type { FC } from 'react';
import React from 'react';
interface Props {
    setIsIdSelectorFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
    selectedId?: string;
}
export declare const AnalyticsIdSelectorControls: FC<Props>;
export {};
