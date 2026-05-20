import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { AppLeaveHandler, ApplicationStart } from '@kbn/core-application-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { VisualizeEditorContext, LensAppLocator, LensAppLocatorParams, LensDocument } from '@kbn/lens-common';
import type { EmbeddableEditorBreadcrumb, EmbeddableEditorState } from '@kbn/embeddable-plugin/public';
import type { RedirectToOriginProps } from './types';
/**
 * Returns true when the user navigated to Lens from an active container view (e.g. a Dashboard panel),
 * as opposed to a library listing page (e.g. the Dashboard Visualizations tab or the Visualize library).
 * Used to determine whether "Save and Return" should be shown and whether `isLinkedToOriginatingApp`
 * should be set on initial load.
 */
export declare function isComingFromContainerView(incomingState: EmbeddableEditorState | undefined): boolean;
export declare function isLegacyEditorEmbeddable(initialContext: VisualizeEditorContext | VisualizeFieldContext | undefined): initialContext is VisualizeEditorContext;
export declare function getCurrentTitle(persistedDoc: LensDocument | undefined, isByValueMode: boolean, initialContext: VisualizeEditorContext | VisualizeFieldContext | undefined): string;
export declare function setBreadcrumbsTitle({ application, serverless, chrome, }: {
    application: ApplicationStart;
    serverless: ServerlessPluginStart | undefined;
    chrome: ChromeStart;
}, { originatingAppName, incomingBreadcrumbs, redirectToOrigin, currentDocTitle, }: {
    originatingAppName: string | undefined;
    incomingBreadcrumbs: EmbeddableEditorBreadcrumb[] | undefined;
    redirectToOrigin: ((props?: RedirectToOriginProps | undefined) => void) | undefined;
    currentDocTitle: string;
}): void;
export declare function useShortUrlService(locator: LensAppLocator | undefined, share: SharePublicStart | undefined): (params: LensAppLocatorParams) => Promise<string>;
export interface UseNavigateBackToAppProps {
    application: ApplicationStart;
    onAppLeave: (handler: AppLeaveHandler) => void;
    legacyEditorAppName: string | undefined;
    legacyEditorAppUrl: string | undefined;
    initialDocFromContext: LensDocument | undefined;
    persistedDoc: LensDocument | undefined;
    isLensEqual: (refDoc: LensDocument | undefined) => boolean;
}
export declare function useNavigateBackToApp({ application, onAppLeave, legacyEditorAppName, legacyEditorAppUrl, initialDocFromContext, persistedDoc, isLensEqual, }: UseNavigateBackToAppProps): {
    shouldShowGoBackToVizEditorModal: boolean;
    goBackToOriginatingApp: () => void;
    navigateToVizEditor: () => void;
    closeGoBackToVizEditorModal: () => void;
};
