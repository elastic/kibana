import React from 'react';
import type { EuiTitleSize } from '@elastic/eui';
import type { AlertEpisodeDetailsServices } from './types';
export interface AlertEpisodeDetailsHeaderSectionProps {
    episodeId: string;
    services: Pick<AlertEpisodeDetailsServices, 'data' | 'http' | 'expressions' | 'spaces'>;
    titleSize?: EuiTitleSize;
}
export declare const AlertEpisodeDetailsHeaderSection: ({ episodeId, services, titleSize, }: AlertEpisodeDetailsHeaderSectionProps) => React.JSX.Element;
