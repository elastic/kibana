import type { ApplicationStart } from '@kbn/core-application-browser';
import React from 'react';
export declare const LogSourcesSettingSynchronisationInfo: React.FC<{
    isLoading: boolean;
    logSourcesValue: string;
    getUrlForApp: ApplicationStart['getUrlForApp'];
    title?: string;
}>;
