import React from 'react';
import type { ViewToggleId } from '../constants';
interface ViewToggleProps {
    idSelected: ViewToggleId;
    onChange: (id: ViewToggleId) => void;
}
export declare const ViewToggle: React.FC<ViewToggleProps>;
export {};
