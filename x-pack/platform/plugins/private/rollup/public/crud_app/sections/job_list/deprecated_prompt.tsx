/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiEmptyPrompt, EuiPageSection } from '@elastic/eui';
import { documentationLinks } from '../../services/documentation_links';

export const DeprecatedPrompt = () => {
  return (
    <EuiPageSection alignment="center" grow={true}>
      <EuiEmptyPrompt
        color="primary"
        data-test-subj="jobListDeprecatedPrompt"
        iconType="iInCircle"
        title={
          <h1>
            <FormattedMessage
              id="xpack.rollupJobs.deprecatedPromptTitle"
              defaultMessage="Deprecated in 8.11.0"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.deprecatedPromptDescription"
                defaultMessage="Rollups are deprecated and will be removed in a future version. Use downsampling instead."
              />
            </p>
          </Fragment>
        }
        actions={
          <EuiButton
            href={documentationLinks.fleet.datastreamsDownsampling}
            target="_blank"
            fill
            iconType="help"
            data-test-subj="rollupDeprecatedPromptDocsLink"
          >
            <FormattedMessage
              id="xpack.rollupJobs.deprecatedPrompt.downsamplingDocsButtonLabel"
              defaultMessage="Downsampling docs"
            />
          </EuiButton>
        }
      />
    </EuiPageSection>
  );
};
