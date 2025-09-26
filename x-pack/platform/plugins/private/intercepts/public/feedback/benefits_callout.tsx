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
import { ELASTIC_SUPPORT_URL } from './constants';

interface Props {
  licenseType: string;
}

export const BenefitsCallout = ({ licenseType }: Props) => (
  <>
    <EuiSpacer size="m" />
    <EuiCallOut
      data-test-subj="benefitsCallout"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.intercepts.feedbackFlyout.benefitsCallout.title"
          defaultMessage="Use your {licenseType} license benefits instead"
          values={{
            licenseType: capitalize(licenseType),
          }}
        />
      }
    >
      <EuiText component="p" size="s">
        <FormattedMessage
          id="xpack.intercepts.feedbackFlyout.benefitsCallout.content"
          defaultMessage="Submit issues and enhancement requests using your dedicated support channel. If your feedback is not urgent, you may still use this form."
        />
      </EuiText>
      <EuiButton href={ELASTIC_SUPPORT_URL} color="warning" fill target="_blank">
        <FormattedMessage
          id="xpack.intercepts.feedbackFlyout.benefitsCallout.supportButton"
          defaultMessage="Access support channel"
        />
      </EuiButton>
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);
