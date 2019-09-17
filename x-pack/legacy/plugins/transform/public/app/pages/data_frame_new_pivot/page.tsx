/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

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

import { Wizard } from './components/wizard';

export const Page: FC = () => (
  <Fragment>
    <EuiPage>
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h1>
                <FormattedMessage
                  id="xpack.transform.transformsWizard.newTransformTitle"
                  defaultMessage="New transform"
                />
                <span>&nbsp;</span>
                <EuiBetaBadge
                  label={i18n.translate('xpack.transform.transformsWizard.betaBadgeLabel', {
                    defaultMessage: `Beta`,
                  })}
                  tooltipContent={i18n.translate(
                    'xpack.transform.transformsWizard.betaBadgeTooltipContent',
                    {
                      defaultMessage: `Transform are a beta feature. We'd love to hear your feedback.`,
                    }
                  )}
                />
              </h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          <Wizard />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
