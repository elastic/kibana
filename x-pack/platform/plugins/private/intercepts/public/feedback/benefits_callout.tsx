/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize } from 'lodash';
import { ELASTIC_SUPPORT_LINK } from './constants';

interface Props {
  licenseType: string;
}

export const BenefitsCallout = ({ licenseType }: Props) => (
  <>
    <EuiSpacer size="m" />
    <EuiCallOut
      color="warning"
      title={
        <FormattedMessage
          id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.title"
          defaultMessage="Use your {licenseType} license benefits instead"
          values={{
            licenseType: capitalize(licenseType),
          }}
        />
      }
    >
      <EuiText component="p" size="s">
        <FormattedMessage
          id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.content"
          defaultMessage="You have an access to a dedicated support channel where you can submit issues and enhancement requests with a faster response time. If your feedback is not urgent, you may still use this form."
        />
      </EuiText>
      <EuiButton href={ELASTIC_SUPPORT_LINK} color="warning" fill target="_blank">
        <FormattedMessage
          id="xpack.intercept.feedbackFlyout.platinumOrHigherCallout.supportButton"
          defaultMessage="Access support channel"
        />
      </EuiButton>
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);
