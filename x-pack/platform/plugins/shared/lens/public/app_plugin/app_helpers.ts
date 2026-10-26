/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { EuiBreadcrumb } from '@elastic/eui';
import type { AppLeaveHandler, ApplicationStart } from '@kbn/core-application-browser';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import { useRef, useCallback, useMemo, useState } from 'react';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type {
  VisualizeEditorContext,
  LensAppLocator,
  LensAppLocatorParams,
  LensDocument,
} from '@kbn/lens-common';
import type {
  EmbeddableEditorBreadcrumb,
  EmbeddableEditorState,
} from '@kbn/embeddable-plugin/public';
import { DASHBOARD_APP_ID, DISCOVER_APP_ID, VISUALIZE_APP_ID } from '@kbn/deeplinks-analytics';
import type { RedirectToOriginProps } from './types';
import type { LensTelemetrySource } from '../lens_ui_telemetry';

/**
 * Returns true when Lens was opened to edit a panel in a container (e.g. Dashboard), indicating
 * that "Save and Return" should be shown and `isLinkedToOriginatingApp` should be set on load.
 */
export function isSaveAndReturn(incomingState: EmbeddableEditorState | undefined): boolean {
  return Boolean(incomingState?.originatingApp && incomingState?.originatingPath);
}

/**
 * Returns where a chart opened in the Lens app is being created, for creation telemetry.
 */
export function getTelemetrySource(
  incomingState: EmbeddableEditorState | undefined,
  isCopy = false
): LensTelemetrySource | undefined {
  // if there's a embeddableId, it's an edit not a create, unless it is saved as a new copy
  if (!incomingState || (incomingState.embeddableId && !isCopy)) {
    return undefined;
  }
  const { originatingApp, originatingContainer } = incomingState;
  if (isSaveAndReturn(incomingState)) {
    const isDashboard = originatingContainer
      ? originatingContainer === 'dashboard'
      : originatingApp === DASHBOARD_APP_ID;
    return isDashboard ? 'dashboards' : undefined;
  }
  // without an originating path, the chart is created in the library, i.e., Visualize or the Dashboards' Visualizations tab.
  if (originatingApp === VISUALIZE_APP_ID || originatingApp === DASHBOARD_APP_ID) {
    return 'library';
  }
  if (originatingApp === DISCOVER_APP_ID) {
    return 'discover';
  }
  return undefined;
}
/**
 * Returns where a chart created inline (edit flyout) is being created, for creation telemetry.
 */
export function getInlineTelemetrySource(
  containerType: string | undefined
): LensTelemetrySource | undefined {
  return containerType === 'dashboard' ? 'dashboards' : undefined;
}

export function isLegacyEditorEmbeddable(
  initialContext: VisualizeEditorContext | VisualizeFieldContext | undefined
): initialContext is VisualizeEditorContext {
  return Boolean(initialContext && 'isEmbeddable' in initialContext && initialContext.isEmbeddable);
}

export function getCurrentTitle(
  persistedDoc: LensDocument | undefined,
  isByValueMode: boolean,
  initialContext: VisualizeEditorContext | VisualizeFieldContext | undefined
) {
  if (persistedDoc) {
    if (isByValueMode) {
      return i18n.translate('xpack.lens.breadcrumbsByValue', {
        defaultMessage: 'Edit visualization',
      });
    }
    if (persistedDoc.title) {
      return persistedDoc.title;
    }
  }
  if (!persistedDoc?.title && isLegacyEditorEmbeddable(initialContext)) {
    return i18n.translate('xpack.lens.breadcrumbsEditInLensFromDashboard', {
      defaultMessage: 'Converting {title} visualization',
      values: {
        title: initialContext.title ? `"${initialContext.title}"` : initialContext.visTypeTitle,
      },
    });
  }
  return i18n.translate('xpack.lens.breadcrumbsCreate', {
    defaultMessage: 'Create',
  });
}

export function setBreadcrumbsTitle(
  {
    application,
    serverless,
    chrome,
  }: {
    application: ApplicationStart;
    serverless: ServerlessPluginStart | undefined;
    chrome: ChromeStart;
  },
  {
    originatingAppName,
    incomingBreadcrumbs,
    redirectToOrigin,
    currentDocTitle,
  }: {
    originatingAppName: string | undefined;
    incomingBreadcrumbs: EmbeddableEditorBreadcrumb[] | undefined;
    redirectToOrigin: ((props?: RedirectToOriginProps | undefined) => void) | undefined;
    currentDocTitle: string;
  }
) {
  const breadcrumbs: EuiBreadcrumb[] = [];

  if (incomingBreadcrumbs?.length) {
    breadcrumbs.push(...incomingBreadcrumbs);
  } else if (originatingAppName && redirectToOrigin) {
    breadcrumbs.push({
      onClick: () => {
        redirectToOrigin();
      },
      text: originatingAppName,
    });
  }

  const currentDocBreadcrumb: EuiBreadcrumb = { text: currentDocTitle };
  breadcrumbs.push(currentDocBreadcrumb);
  if (serverless?.setBreadcrumbs) {
    // TODO: https://github.com/elastic/kibana/issues/163488
    // for now, serverless breadcrumbs only set the title,
    // the rest of the breadcrumbs are handled by the serverless navigation
    // the serverless navigation is not yet aware of the byValue/originatingApp context
    serverless.setBreadcrumbs(currentDocBreadcrumb);
  } else {
    chrome.setBreadcrumbs(breadcrumbs, {
      project: { value: breadcrumbs, absolute: true },
    });
  }
}

export function useShortUrlService(
  locator: LensAppLocator | undefined,
  share: SharePublicStart | undefined
) {
  const shortUrls = useMemo(() => share?.url.shortUrls.get(null), [share]);
  // remember latest URL based on the configuration
  // url_panel_content has a similar logic
  const shareURLCache = useRef({ params: '', url: '' });

  return useCallback(
    async (params: LensAppLocatorParams) => {
      const cacheKey = JSON.stringify(params);
      if (shareURLCache.current.params === cacheKey) {
        return shareURLCache.current.url;
      }
      if (locator && shortUrls) {
        // This is a stripped down version of what the share URL plugin is doing
        const shortUrl = await shortUrls.createWithLocator({ locator, params });
        const absoluteShortUrl = await shortUrl.locator.getUrl(shortUrl.params, { absolute: true });
        shareURLCache.current = { params: cacheKey, url: absoluteShortUrl };
        return absoluteShortUrl;
      }
      return '';
    },
    [locator, shortUrls]
  );
}

export interface UseNavigateBackToAppProps {
  application: ApplicationStart;
  onAppLeave: (handler: AppLeaveHandler) => void;
  legacyEditorAppName: string | undefined;
  legacyEditorAppUrl: string | undefined;
  initialDocFromContext: LensDocument | undefined;
  persistedDoc: LensDocument | undefined;
  isLensEqual: (refDoc: LensDocument | undefined) => boolean;
}

export function useNavigateBackToApp({
  application,
  onAppLeave,
  legacyEditorAppName,
  legacyEditorAppUrl,
  initialDocFromContext,
  persistedDoc,
  isLensEqual,
}: UseNavigateBackToAppProps) {
  const [shouldShowGoBackToVisEditorModal, setIsGoBackToVisEditorModalVisible] = useState(false);
  /** Shared logic to navigate back to the originating viz editor app */
  const navigateBackToVisEditor = useCallback(() => {
    if (legacyEditorAppUrl) {
      onAppLeave((actions) => {
        return actions.default();
      });
      application.navigateToApp(legacyEditorAppName || VISUALIZE_APP_ID, {
        path: legacyEditorAppUrl,
      });
    }
  }, [application, legacyEditorAppName, legacyEditorAppUrl, onAppLeave]);

  // if users comes to Lens from the Viz editor, they should have the option to navigate back
  // used for TopNavMenu
  const goBackToOriginatingApp = useCallback(() => {
    if (legacyEditorAppUrl) {
      if ([initialDocFromContext, persistedDoc].some(isLensEqual)) {
        navigateBackToVisEditor();
      } else {
        setIsGoBackToVisEditorModalVisible(true);
      }
    }
  }, [
    legacyEditorAppUrl,
    initialDocFromContext,
    persistedDoc,
    isLensEqual,
    navigateBackToVisEditor,
    setIsGoBackToVisEditorModalVisible,
  ]);

  // Used for Saving Modal
  const navigateToVisEditor = useCallback(() => {
    setIsGoBackToVisEditorModalVisible(false);
    navigateBackToVisEditor();
  }, [navigateBackToVisEditor, setIsGoBackToVisEditorModalVisible]);

  return {
    shouldShowGoBackToVisEditorModal,
    goBackToOriginatingApp,
    navigateToVisEditor,
    closeGoBackToVisEditorModal: () => setIsGoBackToVisEditorModalVisible(false),
  };
}
