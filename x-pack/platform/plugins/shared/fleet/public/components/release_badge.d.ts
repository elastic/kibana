import React from 'react';
import type { IntegrationCardReleaseLabel } from '../../common/types';
export declare const RELEASE_BADGE_DESCRIPTION: {
    [key in Exclude<IntegrationCardReleaseLabel, 'ga'>]: string;
};
export declare const HeaderReleaseBadge: React.FC<{
    release: IntegrationCardReleaseLabel;
}>;
export declare const InlineReleaseBadge: React.FC<{
    release: IntegrationCardReleaseLabel;
}>;
