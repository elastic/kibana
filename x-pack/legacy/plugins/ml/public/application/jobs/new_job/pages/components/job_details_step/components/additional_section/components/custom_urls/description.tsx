/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink } from '@elastic/eui';
import { useMlKibana } from '../../../../../../../../../contexts/kibana';

export const Description: FC = memo(({ children }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const docsUrl = `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-url.html`;
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
      <EuiFormRow fullWidth>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
