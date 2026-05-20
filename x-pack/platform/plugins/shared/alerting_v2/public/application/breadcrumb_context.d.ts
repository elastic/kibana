import React from 'react';
import type { ChromeBreadcrumb } from '@kbn/core/public';
type SetBreadcrumbs = (crumbs: ChromeBreadcrumb[]) => void;
export declare const BreadcrumbProvider: ({ setBreadcrumbs, children, }: {
    setBreadcrumbs: SetBreadcrumbs;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useSetBreadcrumbs: () => SetBreadcrumbs;
export {};
