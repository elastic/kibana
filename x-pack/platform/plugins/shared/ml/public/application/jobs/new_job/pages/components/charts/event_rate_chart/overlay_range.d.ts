import type { FC } from 'react';
interface Props {
    overlayKey: number;
    start: number;
    end: number;
    color: string;
    showMarker?: boolean;
}
export declare const OverlayRange: FC<Props>;
export {};
