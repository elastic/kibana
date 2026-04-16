/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { Subject } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { FeedbackRegistryEntry } from '@kbn/feedback-registry';
import { getFeedbackQuestionsForApp } from '@kbn/feedback-registry';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { FeedbackFormData } from '../common';
import { getAppDetails } from './src/utils';
import { FeedbackModalMount } from './src/feedback_modal_mount';

interface FeedbackPluginSetupDependencies {
  cloud?: CloudSetup;
}

interface FeedbackPluginStartDependencies {
  telemetry: TelemetryPluginStart;
  cloud?: CloudStart;
  spaces?: SpacesPluginStart;
}


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

    const getQuestions = (appId: string): FeedbackRegistryEntry[] =>
      getFeedbackQuestionsForApp(appId);

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
        core.notifications.toasts.addSuccess({ title });
      }
      if (color === 'error') {
        core.notifications.toasts.addDanger({ title });
      }
    };

    // Subject bridges the AppMenu overflow item's run() callback to the modal's React state
    const openFeedback$ = new Subject<void>();

    // Headless modal controller — mounts in the app bar nav control slot but renders nothing
    // until openFeedback$ emits, at which point the EuiModal appears
    core.chrome.navControls.registerRight({
      order: 1001,
      projectChrome: 'appBar',
      content: (
        <Suspense fallback={null}>
          <FeedbackModalMount
            trigger$={openFeedback$}
            getQuestions={getQuestions}
            getAppDetails={getAppDetailsWrapper}
            getCurrentUserEmail={getCurrentUserEmail}
            sendFeedback={sendFeedback}
            showToast={showToast}
          />
        </Suspense>
      ),
    });

    // Register the persistent overflow item — survives app navigation
    const chrome = core.chrome as InternalChromeStart;
    chrome.project.registerGlobalOverflowItem({
      id: 'global-feedback',
      label: i18n.translate('feedback.appMenu.feedbackLabel', { defaultMessage: 'Feedback' }),
      iconType: 'editorComment',
      order: 102,
      run: () => openFeedback$.next(),
    });

    return {};
  }

  public stop() {}
}
