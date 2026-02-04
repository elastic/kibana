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

    core.chrome.navControls.registerRight({
      order: 1001,
      mount: (element) => {
        import('./src/components/feedback_trigger_button').then(({ FeedbackTriggerButton }) => {
          ReactDOM.render(
            core.rendering.addContext(
              <FeedbackTriggerButton
                core={core}
                cloud={cloud}
                organizationId={this.organizationId}
              />
            ),
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
