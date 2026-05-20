import type { FC } from 'react';
import React from 'react';
import { type HtmlPortalNode } from 'react-reverse-portal';
import { type AppMountParameters } from '@kbn/core/public';
import type { PageDependencies } from '../../routing/router';
export declare const MlPageControlsContext: React.Context<{
    headerPortal: HtmlPortalNode;
    leftHeaderPortal: HtmlPortalNode;
    rightHeaderPortal: HtmlPortalNode;
    setHeaderActionMenu?: AppMountParameters["setHeaderActionMenu"];
    setIsHeaderMounted: (v: boolean) => void;
    isHeaderMounted: boolean;
    isLeftSectionMounted: boolean;
    setIsLeftSectionMounted: (v: boolean) => void;
    isRightSectionMounted: boolean;
    setIsRightSectionMounted: (v: boolean) => void;
    headerRestrictWidth?: boolean | number;
    setHeaderRestrictWidth: (v: number | undefined) => void;
    wrapHeader: boolean;
    setWrapHeader: (v: boolean) => void;
}>;
/**
 * Main page component of the ML App
 * @constructor
 */
export declare const MlPage: FC<{
    pageDeps: PageDependencies;
    entryPoint?: string;
}>;
