import React from 'react';
import type { AppMountParameters, ChromeBreadcrumb } from '@kbn/core/public';
export declare const EvalsApp: React.FC<{
    history: AppMountParameters['history'];
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
    getHref: (path: string) => string;
    breadcrumbPrefix?: ChromeBreadcrumb[];
}>;
