/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';

interface FeedbackPluginStartDependencies {
  licensing: LicensingPluginStart;
}

export class FeedbackPlugin implements Plugin {
  public setup() {
    return {};
  }

  public start(core: CoreStart, { licensing }: FeedbackPluginStartDependencies) {
    const isFeedbackEnabled = core.notifications.feedback.isEnabled();

    if (!isFeedbackEnabled) {
      return {};
    }

    core.chrome.navControls.registerRight({
      order: 1000,
      mount: (element) => {
        import('./src/components/feedback_trigger_button').then(({ FeedbackTriggerButton }) => {
          ReactDOM.render(<FeedbackTriggerButton core={core} />, element);
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
