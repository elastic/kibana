/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import { getFeedbackQuestionsForApp } from '@kbn/feedback-registry';
import { getAppDetails } from './src/utils';

interface FeedbackPluginSetupDependencies {
  cloud?: CloudSetup;
}

interface FeedbackPluginStartDependencies {
  cloud?: CloudStart;
  telemetry: TelemetryPluginStart;
}

export class FeedbackPlugin implements Plugin {
  private organizationId?: string;

  public setup(_core: CoreSetup, { cloud }: FeedbackPluginSetupDependencies) {
    this.organizationId = cloud?.organizationId;
    return {};
  }

  public start(core: CoreStart, { cloud, telemetry }: FeedbackPluginStartDependencies) {
    const isFeedbackEnabled = core.notifications.feedback.isEnabled();
    const isTelemetryEnabled = telemetry.telemetryService.canSendTelemetry();
    const isOptedIn = telemetry.telemetryService.getIsOptedIn();

    if (!isFeedbackEnabled || !isTelemetryEnabled || !isOptedIn) {
      return {};
    }

    const organizationId = this.organizationId;
    const serverlessProjectType = cloud?.serverless?.projectType;

    core.chrome.navControls.registerRight({
      order: 1001,
      mount: (element) => {
        import('@kbn/feedback-components/src/components/feedback_trigger_button').then(
          ({ FeedbackTriggerButton }) => {
            const appDetails = getAppDetails(core);
            const questions = getFeedbackQuestionsForApp(appDetails.id);

            const getCurrentUserEmail = async (): Promise<string | undefined> => {
              if (!core.security) {
                return undefined;
              }
              try {
                const user = await core.security.authc.getCurrentUser();
                return user?.email;
              } catch {
                return;
              }
            };

            const sendFeedback = async (data: Record<string, unknown>) => {
              await core.http.post('/internal/feedback/send', {
                body: JSON.stringify(data),
              });
            };

            const showSuccessToast = (title: string) => {
              core.notifications.toasts.addSuccess({ title });
            };

            const showErrorToast = (title: string) => {
              core.notifications.toasts.addDanger({ title });
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

            ReactDOM.render(
              core.rendering.addContext(
                <FeedbackTriggerButton
                  appDetails={appDetails}
                  questions={questions}
                  activeSolutionNavId$={core.chrome.getActiveSolutionNavId$()}
                  serverlessProjectType={serverlessProjectType}
                  organizationId={organizationId}
                  getCurrentUserEmail={getCurrentUserEmail}
                  sendFeedback={sendFeedback}
                  showSuccessToast={showSuccessToast}
                  showErrorToast={showErrorToast}
                  checkTelemetryOptIn={checkTelemetryOptIn}
                />
              ),
              element
            );
          }
        );

        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {};
  }

  public stop() {}
}
