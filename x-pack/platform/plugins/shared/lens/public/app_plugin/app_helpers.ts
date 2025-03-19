/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { EuiBreadcrumb } from '@elastic/eui';
import { AppLeaveHandler, ApplicationStart } from '@kbn/core-application-browser';
import { ChromeStart } from '@kbn/core-chrome-browser';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { useRef, useCallback, useMemo, useState } from 'react';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import { LensAppLocator, LensAppLocatorParams } from '../../common/locator/locator';
import { VisualizeEditorContext } from '../types';
import { LensDocument } from '../persistence';
import { RedirectToOriginProps } from './types';

const VISUALIZE_APP_ID = 'visualize';

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
    isByValueMode,
    originatingAppName,
    redirectToOrigin,
    isFromLegacyEditor,
    currentDocTitle,
  }: {
    isByValueMode: boolean;
    originatingAppName: string | undefined;
    redirectToOrigin: ((props?: RedirectToOriginProps | undefined) => void) | undefined;
    isFromLegacyEditor: boolean;
    currentDocTitle: string;
  }
) {
  const breadcrumbs: EuiBreadcrumb[] = [];
  if (isFromLegacyEditor && originatingAppName && redirectToOrigin) {
    breadcrumbs.push({
      onClick: () => {
        redirectToOrigin();
      },
      text: originatingAppName,
    });
  }
  if (!isByValueMode) {
    breadcrumbs.push({
      href: application.getUrlForApp(VISUALIZE_APP_ID),
      onClick: (e) => {
        application.navigateToApp(VISUALIZE_APP_ID, { path: '/' });
        e.preventDefault();
      },
      text: i18n.translate('xpack.lens.breadcrumbsTitle', {
        defaultMessage: 'Visualize Library',
      }),
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
    chrome.setBreadcrumbs(breadcrumbs);
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
  const [shouldShowGoBackToVizEditorModal, setIsGoBackToVizEditorModalVisible] = useState(false);
  /** Shared logic to navigate back to the originating viz editor app */
  const navigateBackToVizEditor = useCallback(() => {
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
        navigateBackToVizEditor();
      } else {
        setIsGoBackToVizEditorModalVisible(true);
      }
    }
  }, [
    legacyEditorAppUrl,
    initialDocFromContext,
    persistedDoc,
    isLensEqual,
    navigateBackToVizEditor,
    setIsGoBackToVizEditorModalVisible,
  ]);

  // Used for Saving Modal
  const navigateToVizEditor = useCallback(() => {
    setIsGoBackToVizEditorModalVisible(false);
    navigateBackToVizEditor();
  }, [navigateBackToVizEditor, setIsGoBackToVizEditorModalVisible]);

  return {
    shouldShowGoBackToVizEditorModal,
    goBackToOriginatingApp,
    navigateToVizEditor,
    closeGoBackToVizEditorModal: () => setIsGoBackToVizEditorModalVisible(false),
  };
}
