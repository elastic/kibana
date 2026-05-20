import React from 'react';
import type { UIStateContextValue } from './types';
export interface UIStateProviderProps {
    children: React.ReactNode;
}
export declare const UIStateProvider: React.FC<UIStateProviderProps>;
export declare const useUIState: () => UIStateContextValue;
