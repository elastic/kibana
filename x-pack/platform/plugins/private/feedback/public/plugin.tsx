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
import { feedbackSubmittedEventType } from './src/telemetry/feedback_events';

interface FeedbackPluginSetupDependencies {
  cloud?: CloudSetup;
}

interface FeedbackPluginStartDependencies {
  cloud?: CloudStart;
}

export class FeedbackPlugin implements Plugin {
  private organizationId?: string;

  public setup(core: CoreSetup, { cloud }: FeedbackPluginSetupDependencies) {
    core.analytics.registerEventType(feedbackSubmittedEventType);
    this.organizationId = cloud?.organizationId;
    return {};
  }

  public start(core: CoreStart, { cloud }: FeedbackPluginStartDependencies) {
    const isFeedbackEnabled = core.notifications.feedback.isEnabled();

    if (!isFeedbackEnabled) {
      return {};
    }

    core.chrome.navControls.registerRight({
      order: 1001,
      mount: (element) => {
        import('./src/components/feedback_trigger_button').then(({ FeedbackTriggerButton }) => {
          ReactDOM.render(
            <FeedbackTriggerButton
              core={core}
              cloud={cloud}
              organizationId={this.organizationId}
            />,
            element
          );
        });

        return () => {
          ReactDOM.unmountComponentAtNode(element);
        };
      },
    });

    return {};
  }

  public stop() {}
}
