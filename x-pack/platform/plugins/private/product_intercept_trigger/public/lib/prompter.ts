/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type CoreStart } from '@kbn/core/public';
import { EuiText } from '@elastic/eui';
import { NPSScoreInput } from './components';
import { TRIGGER_API_ENDPOINT } from '../../common/constants';

type ProductInterceptPrompterArgs = Pick<CoreStart, 'http' | 'notifications' | 'userProfile'>;

export class ProductInterceptPrompter {
  start({ http, notifications, userProfile }: ProductInterceptPrompterArgs) {
    http
      .get<{ triggerIntervalInMs: number; runs: number }>(TRIGGER_API_ENDPOINT)
      .then((response) => {
        if (typeof response.runs !== 'undefined') {
          return userProfile.getCurrent().then((profileData) => {
            // Ideally we should check if the user feedback prompt was engaged with at the last feedback
            // the approach will be to check if on user profile the trigger run counts matches the user's profile,
            // in the eventuality that it does, we trigger a feedback session and bump the user's profile run count.
            // with the approach the user will only be prompted once per cycle and per device.
            let runCount = 0;

            setInterval(() => {
              notifications.productIntercepts.add({
                title: 'hello',
                // ideally this will come from a predefined place, so it's configurable
                steps: [
                  {
                    id: 'hello',
                    title: `Help us improve Kibana (${String(response.runs + runCount)})`,
                    content: React.createElement(
                      EuiText,
                      {},
                      "We'd love your feedback to make Kibana even better. It will take 10 seconds only."
                    ),
                  },
                  {
                    id: 'satisfaction',
                    title: 'Overall, how satisfied or dissatisfied are you with Kibana?',
                    content: React.createElement(NPSScoreInput, {
                      onSelectionChange: () => {
                        // do something with the selection
                      },
                      lowerBoundHelpText: 'Very dissatisfied',
                      upperBoundHelpText: 'Very satisfied',
                    }),
                  },
                  {
                    id: 'ease',
                    title: `Overall, how difficult or easy is it to use Kibana?`,
                    content: React.createElement(NPSScoreInput, {
                      onSelectionChange: () => {
                        // do something with the selection
                      },
                      lowerBoundHelpText: 'Very difficult',
                      upperBoundHelpText: 'Very easy',
                    }),
                  },
                ],
                onFinish() {
                  // maybe bump user profile run count and close the dialog
                },
                onDismiss() {
                  // maybe do something user
                },
              });

              runCount++;
            }, response.triggerIntervalInMs);
          });
        }

        return;
      })
      .catch((error) => {
        // log error
      });
  }
}
