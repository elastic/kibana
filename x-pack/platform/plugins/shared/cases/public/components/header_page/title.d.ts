import React from 'react';
import type { ReleasePhase } from '../types';
interface Props {
    title: string | React.ReactNode;
    releasePhase: ReleasePhase;
    children?: React.ReactNode;
}
export declare const TitleExperimentalBadge: React.NamedExoticComponent<{}>;
export declare const TitleBetaBadge: React.NamedExoticComponent<{}>;
export declare const Title: React.NamedExoticComponent<Props>;
export {};
