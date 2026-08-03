import type { ReactElement } from 'react';
import React from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
interface TourCalloutBaseProps extends Pick<EuiTourStepProps, 'title' | 'content' | 'step' | 'stepsTotal' | 'anchorPosition' | 'minWidth' | 'maxWidth' | 'hasArrow' | 'subtitle' | 'maxWidth'> {
    children: ReactElement;
    isOpen?: boolean;
    footerButtonLabel?: string;
    zIndex?: number;
    dismissTour?: () => void;
}
export type TourCalloutProps = (TourCalloutBaseProps & {
    footerAction?: undefined;
    footerButtonLabel: string;
}) | (TourCalloutBaseProps & {
    footerAction: EuiTourStepProps['footerAction'];
    footerButtonLabel?: string;
});
export declare const TourCallout: ({ title, content, step, stepsTotal, anchorPosition, children, isOpen, hasArrow, subtitle, maxWidth, footerButtonLabel, zIndex, dismissTour, footerAction, ...rest }: TourCalloutProps) => React.JSX.Element;
export {};
