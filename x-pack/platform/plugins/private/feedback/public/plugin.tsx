/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AppDetails, FeedbackRegistryEntry } from '@kbn/ui-feedback';
import { isNextChrome } from '@kbn/core-chrome-feature-flags';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { firstValueFrom, type Subscription } from 'rxjs';
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

const LazyFeedbackTriggerButton = lazy(() =>
  import('@kbn/ui-feedback').then(({ FeedbackTriggerButton }) => ({
    default: FeedbackTriggerButton,
  }))
);

const LazyFeedbackContainer = lazy(() =>
  import('@kbn/ui-feedback').then(({ FeedbackContainer }) => ({
    default: FeedbackContainer,
  }))
);

const feedbackModalCss = css`
  overflow-y: auto;
`;

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
        const toastRef: {
          current: ReturnType<typeof core.notifications.toasts.add> | undefined;
        } = { current: undefined };

        const titleContent = toMountPoint(
          core.rendering.addContext(
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} component="span">
              <EuiFlexItem grow={false} component="span">
                <EuiIcon type="checkCircleFill" color="success" size="m" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem component="span">
                <FormattedMessage
                  id="feedback.submissionSuccessToast.title"
                  defaultMessage="Thanks for your feedback!"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          core
        );

        const textContent = toMountPoint(
          core.rendering.addContext(
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="empty" size="m" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiText>
                      <FormattedMessage
                        id="feedback.submissionSuccessToast.body"
                        defaultMessage="Want to help shape the future of Elastic? Sign up to join our research panel!"
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          color="success"
                          iconType="external"
                          iconSide="right"
                          href="https://ela.st/user-interviews-opt-in"
                          target="_blank"
                        >
                          <FormattedMessage
                            id="feedback.submissionSuccessToast.participateButton"
                            defaultMessage="Participate"
                          />
                        </EuiButton>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          color="success"
                          onClick={() =>
                            toastRef.current && core.notifications.toasts.remove(toastRef.current)
                          }
                        >
                          <FormattedMessage
                            id="feedback.submissionSuccessToast.maybeLaterButton"
                            defaultMessage="Maybe later"
                          />
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          core
        );

        toastRef.current = core.notifications.toasts.add({
          color: 'success',
          title: titleContent,
          text: textContent,
          toastLifeTimeMs: 60_000,
        });
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
    const checkTelemetryOptIn = () => firstValueFrom(isOptedIn$);

    if (isNextChrome(core.featureFlags)) {
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
    }

    core.chrome.navControls.registerRight({
      order: 1001,
      content: (
        <Suspense fallback={null}>
          <LazyFeedbackTriggerButton {...deps} checkTelemetryOptIn={checkTelemetryOptIn} />
        </Suspense>
      ),
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
