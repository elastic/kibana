/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { metadata } from 'ui/metadata';

const createJobLink = '#/jobs/new_job/step/index_or_search';
// metadata.branch corresponds to the version used in documentation links.
const docsLink = `https://www.elastic.co/guide/en/kibana/${metadata.branch}/xpack-ml.html`;
const feedbackLink = 'https://www.elastic.co/community/';

export const OverviewSideBar: FC = () => (
  <EuiFlexItem grow={1}>
    <EuiText className="mlOverview__sidebar">
      <h2>
        <FormattedMessage
          id="xpack.ml.overview.gettingStartedSectionTitle"
          defaultMessage="Getting Started"
        />
      </h2>
      <p>
        <FormattedMessage
          id="xpack.ml.overview.gettingStartedSectionText"
          defaultMessage="Welcome to Machine Learning.
          Get started by reviewing our {docs} or {createJob}.
          For information about upcoming features and tutorials be sure to check out our solutions page."
          values={{
            docs: (
              <EuiLink href={docsLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionDocs"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
            createJob: (
              <EuiLink href={createJobLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionCreateJob"
                  defaultMessage="creating a new job"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <h2>
        <FormattedMessage id="xpack.ml.overview.feedbackSectionTitle" defaultMessage="Feedback" />
      </h2>
      <p>
        <FormattedMessage
          id="xpack.ml.overview.feedbackSectionText"
          defaultMessage="If you have input or suggestions regarding your experience with Machine Learning please feel free to submit {feedbackLink}."
          values={{
            feedbackLink: (
              <EuiLink href={feedbackLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.feedbackSectionLink"
                  defaultMessage="submit feedback online"
                />
              </EuiLink>
            ),
            createJob: (
              <EuiLink href={createJobLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionCreateJob"
                  defaultMessage="creating a new job"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  </EuiFlexItem>
);
