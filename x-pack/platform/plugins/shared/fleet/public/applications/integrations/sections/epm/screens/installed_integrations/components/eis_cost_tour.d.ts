import React from 'react';
import type { EuiTourStepProps } from '@elastic/eui';
export interface EisCostTourProps {
    anchorPosition?: EuiTourStepProps['anchorPosition'];
    ctaLink?: string;
    isCloudEnabled: boolean;
    children: React.ReactElement;
}
export declare const EisCostTour: ({ anchorPosition, ctaLink, isCloudEnabled, children, }: EisCostTourProps) => React.JSX.Element;
