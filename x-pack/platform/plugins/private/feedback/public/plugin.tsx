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
import type { FeedbackRegistryEntry } from '@kbn/feedback-components';
import { isNextChrome } from '@kbn/core-chrome-feature-flags';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FeedbackFormData } from '../common';
import { getAppDetails } from './src/utils';

interface FeedbackPluginSetupDependencies {
  cloud?: CloudSetup;
}

interface FeedbackPluginStartDependencies {
  telemetry: TelemetryPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}

const LazyFeedbackTriggerButton = lazy(() =>
  import('@kbn/feedback-components').then(({ FeedbackTriggerButton }) => ({
    default: FeedbackTriggerButton,
  }))
);

const LazyFeedbackContainer = lazy(() =>
  import('@kbn/feedback-components').then(({ FeedbackContainer }) => ({
    default: FeedbackContainer,
  }))
);

export class FeedbackPlugin implements Plugin {
  private organizationId?: string;

  public setup(_core: CoreSetup, { cloud }: FeedbackPluginSetupDependencies) {
    this.organizationId = cloud?.organizationId;
    return {};
  }

  public start(core: CoreStart, { cloud, telemetry, spaces }: FeedbackPluginStartDependencies) {
    const isFeedbackEnabled = core.notifications.feedback.isEnabled();
    const isTelemetryEnabled = telemetry.telemetryService.canSendTelemetry();
    const isOptedIn = telemetry.telemetryService.getIsOptedIn();

    if (!isFeedbackEnabled || !isTelemetryEnabled || !isOptedIn) {
      return {};
    }

    const organizationId = this.organizationId;

    const getSolution = async (): Promise<string> => {
      try {
        const space = await spaces?.getActiveSpace();
        return space?.solution || cloud?.serverless?.projectType || 'classic';
      } catch {
        return cloud?.serverless?.projectType || 'classic';
      }
    };

    const getAppDetailsWrapper = () => getAppDetails(core);

    const getQuestions = async (appId: string): Promise<FeedbackRegistryEntry[]> => {
      const { getFeedbackQuestionsForApp } = await import('@kbn/feedback-registry');
      return getFeedbackQuestionsForApp(appId);
    };

    const getCurrentUserEmail = async (): Promise<string | undefined> => {
      if (!core.security) return undefined;
      try {
        const user = await core.security.authc.getCurrentUser();
        return user?.email;
      } catch {
        return;
      }
    };

    const sendFeedback = async (data: FeedbackFormData) => {
      const solution = await getSolution();
      await core.http.post('/internal/feedback/send', {
        body: JSON.stringify({ ...data, solution, organization_id: organizationId }),
      });
    };

    const showToast = (title: string, color: 'success' | 'error') => {
      if (color === 'success') {
        const toastRef: {
          current: ReturnType<typeof core.notifications.toasts.add> | undefined;
        } = { current: undefined };

        const titleContent = toMountPoint(
          core.rendering.addContext(
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" size="m" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem>
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
                          iconType="popout"
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
        });
      }
      if (color === 'error') {
        core.notifications.toasts.addDanger({ title });
      }
    };

    const checkTelemetryOptIn = async (): Promise<boolean> => {
      try {
        const telemetryConfig = await core.http.get<{ optIn: boolean | null }>(
          '/internal/telemetry/config',
          { version: '2' }
        );
        return telemetryConfig.optIn === true;
      } catch {
        return false;
      }
    };

    if (isNextChrome(core.featureFlags)) {
      const modalCss = css`
        overflow-y: auto;
      `;

      core.chrome.next.registerFeedbackHandler(() => {
        const modal = core.overlays.openModal(
          toMountPoint(
            core.rendering.addContext(
              <EuiModal
                onClose={() => modal.close()}
                aria-label={i18n.translate('feedback.modal.ariaLabel', {
                  defaultMessage: 'Feedback form',
                })}
                css={modalCss}
              >
                <Suspense fallback={null}>
                  <LazyFeedbackContainer
                    getQuestions={getQuestions}
                    getAppDetails={getAppDetailsWrapper}
                    getCurrentUserEmail={getCurrentUserEmail}
                    sendFeedback={sendFeedback}
                    showToast={showToast}
                    hideFeedbackContainer={() => modal.close()}
                  />
                </Suspense>
              </EuiModal>
            ),
            core
          )
        );
      });
    }

    core.chrome.navControls.registerRight({
      order: 1001,
      content: (
        <Suspense fallback={null}>
          <LazyFeedbackTriggerButton
            getQuestions={getQuestions}
            getAppDetails={getAppDetailsWrapper}
            getCurrentUserEmail={getCurrentUserEmail}
            sendFeedback={sendFeedback}
            showToast={showToast}
            checkTelemetryOptIn={checkTelemetryOptIn}
          />
        </Suspense>
      ),
    });

    return {};
  }

  public stop() {}
}
