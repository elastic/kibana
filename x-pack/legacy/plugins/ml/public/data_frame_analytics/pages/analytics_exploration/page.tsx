/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiBetaBadge,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { NavigationMenu } from '../../../components/navigation_menu/navigation_menu';

import { Exploration } from './components/exploration';

export const Page: FC<{ jobId: string }> = ({ jobId }) => (
  <Fragment>
    <NavigationMenu tabId="data_frame_analytics" />
    <EuiPage data-test-subj="mlPageDataFrameAnalyticsExploration">
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.exploration.title"
                  defaultMessage="Analytics exploration"
                />
                <span>&nbsp;</span>
                <EuiBetaBadge
                  label={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.experimentalBadgeLabel',
                    {
                      defaultMessage: 'Experimental',
                    }
                  )}
                  tooltipContent={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.experimentalBadgeTooltipContent',
                    {
                      defaultMessage: `Data frame analytics are an experimental feature. We'd love to hear your feedback.`,
                    }
                  )}
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          <Exploration jobId={jobId} />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
