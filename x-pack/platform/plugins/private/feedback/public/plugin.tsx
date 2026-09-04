/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiModal } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AppDetails, FeedbackRegistryEntry } from '@kbn/ui-feedback';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import type { Subscription } from 'rxjs';
import type { FeedbackContext, FeedbackFormData, SetFeedbackContext } from '../common';
import { getAppDetails } from './src/utils';

interface FeedbackPluginSetupDependencies {
  cloud?: CloudSetup;
}

interface FeedbackPluginStartDependencies {
  telemetry: TelemetryPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}

interface FeedbackDeps {
  getQuestions: (appId: string) => Promise<FeedbackRegistryEntry[]>;
  getAppDetails: () => AppDetails;
  getCurrentUserEmail: () => Promise<string | undefined>;
  sendFeedback: (data: FeedbackFormData) => Promise<void>;
  showToast: (title: string, color: 'success' | 'error') => void;
}

const LazyFeedbackContainer = lazy(() =>
  import('@kbn/ui-feedback').then(({ FeedbackContainer }) => ({
    default: FeedbackContainer,
  }))
);

const feedbackModalCss = css`
  overflow-y: auto;
`;

const RESEARCH_PANEL_SURVEY_URL = 'https://ela.st/user-interviews-opt-in';

const createFeedbackDeps = (
  core: CoreStart,
  organizationId: string | undefined,
  getContext: () => FeedbackContext | undefined,
  getTitleOverride: () => string | undefined,
  cloud?: CloudStart,
  spaces?: SpacesPluginStart
): FeedbackDeps => {
  const getSolution = async (): Promise<string> => {
    try {
      const space = await spaces?.getActiveSpace();
      return space?.solution || cloud?.serverless?.projectType || 'classic';
    } catch {
      return cloud?.serverless?.projectType || 'classic';
    }
  };

  return {
    getAppDetails: () => getAppDetails(core, getContext(), getTitleOverride()),
    getQuestions: async (appId: string) => {
      const { getFeedbackQuestionsForApp } = await import('@kbn/feedback-registry');
      return getFeedbackQuestionsForApp(appId);
    },
    getCurrentUserEmail: async () => {
      if (!core.security) return undefined;
      try {
        const user = await core.security.authc.getCurrentUser();
        return user?.email;
      } catch {
        return;
      }
    },
    sendFeedback: async (data: FeedbackFormData) => {
      const solution = await getSolution();
      await core.http.post('/internal/feedback/send', {
        body: JSON.stringify({ ...data, solution, organization_id: organizationId }),
      });
    },
    showToast: (title: string, color: 'success' | 'error') => {
      if (color === 'success') {
        void import('@kbn/ui-feedback').then(
          ({
            FeedbackSuccessToastTitle,
            FeedbackSuccessToastBody,
            FEEDBACK_SUCCESS_TOAST_LIFE_TIME_MS: toastLifeTimeMs,
          }) => {
            const toastRef: {
              current: ReturnType<typeof core.notifications.toasts.add> | undefined;
            } = { current: undefined };

            toastRef.current = core.notifications.toasts.add({
              color: 'success',
              title: toMountPoint(core.rendering.addContext(<FeedbackSuccessToastTitle />), core),
              text: toMountPoint(
                core.rendering.addContext(
                  <FeedbackSuccessToastBody
                    surveyUrl={RESEARCH_PANEL_SURVEY_URL}
                    onDismiss={() => {
                      if (toastRef.current) {
                        core.notifications.toasts.remove(toastRef.current);
                      }
                    }}
                  />
                ),
                core
              ),
              toastLifeTimeMs,
            });
          }
        );
      }
      if (color === 'error') {
        core.notifications.toasts.addDanger({ title });
      }
    },
  };
};

const openFeedbackModal = (core: CoreStart, deps: FeedbackDeps) => {
  const modal = core.overlays.openModal(
    toMountPoint(
      core.rendering.addContext(
        <EuiModal
          onClose={() => modal.close()}
          aria-label={i18n.translate('feedback.modal.ariaLabel', {
            defaultMessage: 'Feedback form',
          })}
          css={feedbackModalCss}
        >
          <Suspense fallback={null}>
            <LazyFeedbackContainer
              getQuestions={deps.getQuestions}
              getAppDetails={deps.getAppDetails}
              getCurrentUserEmail={deps.getCurrentUserEmail}
              sendFeedback={deps.sendFeedback}
              showToast={deps.showToast}
              hideFeedbackContainer={() => modal.close()}
            />
          </Suspense>
        </EuiModal>
      ),
      core
    )
  );
};

export class FeedbackPlugin implements Plugin {
  private organizationId?: string;
  private telemetryOptInSubscription?: Subscription;
  private appIdSubscription?: Subscription;
  private currentAppId?: string;
  private contextAppId?: string;
  private context?: FeedbackContext;
  private titleOverride?: string;

  public setup(_core: CoreSetup, { cloud }: FeedbackPluginSetupDependencies) {
    this.organizationId = cloud?.organizationId;
    return {};
  }

  public start(core: CoreStart, { cloud, telemetry, spaces }: FeedbackPluginStartDependencies) {
    this.appIdSubscription = core.application.currentAppId$.subscribe((appId) => {
      if (appId !== this.currentAppId) {
        this.context = undefined;
        this.contextAppId = undefined;
        this.titleOverride = undefined;
      }
      this.currentAppId = appId;
    });

    /**
     * Stores opaque feedback context for the current app.
     * `options.title` fully replaces the derived app title in the feedback UI.
     * No-ops unless `appId` matches `currentAppId`, so one app cannot pollute another.
     */
    const setContext: SetFeedbackContext = (appId, context, options) => {
      if (appId !== this.currentAppId) {
        return () => {};
      }

      this.contextAppId = appId;
      this.context = context;
      this.titleOverride = options?.title;
      return () => {
        if (this.contextAppId === appId) {
          this.context = undefined;
          this.contextAppId = undefined;
          this.titleOverride = undefined;
        }
      };
    };

    const getContext = () => (this.contextAppId === this.currentAppId ? this.context : undefined);
    const getTitleOverride = () =>
      this.contextAppId === this.currentAppId ? this.titleOverride : undefined;

    if (!core.notifications.feedback.isEnabled()) {
      return { setContext };
    }

    const deps = createFeedbackDeps(
      core,
      this.organizationId,
      getContext,
      getTitleOverride,
      cloud,
      spaces
    );
    const { isOptedIn$ } = telemetry.telemetryService;

    let unregisterFeedbackHandler: (() => void) | undefined;

    this.telemetryOptInSubscription = isOptedIn$.subscribe((optIn) => {
      unregisterFeedbackHandler?.();
      unregisterFeedbackHandler = undefined;

      if (optIn) {
        unregisterFeedbackHandler = core.chrome.next.registerFeedbackHandler(() => {
          openFeedbackModal(core, deps);
        });
      }
    });

    return { setContext };
  }

  public stop() {
    this.telemetryOptInSubscription?.unsubscribe();
    this.telemetryOptInSubscription = undefined;
    this.appIdSubscription?.unsubscribe();
    this.appIdSubscription = undefined;
    this.context = undefined;
    this.contextAppId = undefined;
    this.titleOverride = undefined;
  }
}
