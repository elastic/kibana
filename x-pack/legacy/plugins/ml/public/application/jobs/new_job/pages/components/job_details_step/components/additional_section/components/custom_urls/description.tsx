/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink } from '@elastic/eui';
import { metadata } from 'ui/metadata';

const docsUrl = `https://www.elastic.co/guide/en/machine-learning/${metadata.branch}/ml-configuring-url.html`;

export const Description: FC = memo(({ children }) => {
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrls.title',
    {
      defaultMessage: 'Custom URLs',
    }
  );
  return (
    <EuiDescribedFormGroup
      fullWidth
      className="ml-custom-urls-selection"
      idAria="custom_urls_description"
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.description"
          defaultMessage="Provide links from anomalies to Kibana dashboards, the Discovery page, or other web pages. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.learnMoreLinkText"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      }
    >
      <EuiFormRow describedByIds={['custom_urls_description']} fullWidth>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
