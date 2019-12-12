/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiLink, EuiButton } from '@elastic/eui';
import euiStyled from '../../../../../../common/eui_styled_components';

export const LogEntryRateUnavailableContent: React.FunctionComponent<{}> = () => (
  <EmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.logs.analysisPage.unavailable.mLDisabledTitle"
          defaultMessage="The Analysis feature requires Machine Learning"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.infra.logs.analysisPage.unavailable.mlDisabledBody"
          defaultMessage="Check the {machineLearningAppLink} for more information."
          values={{
            machineLearningAppLink: (
              <EuiLink href="ml" target="_blank">
                <FormattedMessage
                  id="xpack.infra.logs.analysisPage.unavailable.mlAppLink"
                  defaultMessage="Machine Learning app"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    }
    actions={
      <EuiButton target="_blank" href="ml" color="primary" fill>
        {i18n.translate('xpack.infra.logs.analysisPage.unavailable.mlAppButton', {
          defaultMessage: 'Open Machine Learning',
        })}
      </EuiButton>
    }
  />
);

const EmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
