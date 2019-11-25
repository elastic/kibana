/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';

const createJobLink = '#/jobs/new_job/step/index_or_search';
// metadata.branch corresponds to the version used in documentation links.
const docsLink = `https://www.elastic.co/guide/en/kibana/${metadata.branch}/xpack-ml.html`;
const feedbackLink = 'https://www.elastic.co/community/';
const transformsLink = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/transform`;
const whatIsMachineLearningLink = 'https://www.elastic.co/what-is/elasticsearch-machine-learning';

interface Props {
  createAnomalyDetectionJobDisabled: boolean;
}

function getCreateJobLink(createAnomalyDetectionJobDisabled: boolean) {
  return createAnomalyDetectionJobDisabled === true ? (
    <FormattedMessage
      id="xpack.ml.overview.gettingStartedSectionCreateJob"
      defaultMessage="creating a new job"
    />
  ) : (
    <EuiLink href={createJobLink} target="blank">
      <FormattedMessage
        id="xpack.ml.overview.gettingStartedSectionCreateJob"
        defaultMessage="creating a new job"
      />
    </EuiLink>
  );
}

export const OverviewSideBar: FC<Props> = ({ createAnomalyDetectionJobDisabled }) => (
  <EuiFlexItem grow={1}>
    <EuiText className="mlOverview__sidebar">
      <h2>
        <FormattedMessage
          id="xpack.ml.overview.gettingStartedSectionTitle"
          defaultMessage="Getting started"
        />
      </h2>
      <p>
        <FormattedMessage
          id="xpack.ml.overview.gettingStartedSectionText"
          defaultMessage="Welcome to Machine Learning. Get started by reviewing our {docs} or {createJob}. For more information about machine learning in the Elastic stack please see {whatIsMachineLearning}. We recommend using {transforms} to create feature indices for analytics jobs."
          values={{
            docs: (
              <EuiLink href={docsLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionDocs"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
            createJob: getCreateJobLink(createAnomalyDetectionJobDisabled),
            transforms: (
              <EuiLink href={transformsLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionTransforms"
                  defaultMessage="Elasticsearch's transforms"
                />
              </EuiLink>
            ),
            whatIsMachineLearning: (
              <EuiLink href={whatIsMachineLearningLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.gettingStartedSectionWhatIsMachineLearning"
                  defaultMessage="here"
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
          defaultMessage="If you have input or suggestions regarding your experience with Machine Learning please feel free to submit {feedbackLink}."
          values={{
            feedbackLink: (
              <EuiLink href={feedbackLink} target="blank">
                <FormattedMessage
                  id="xpack.ml.overview.feedbackSectionLink"
                  defaultMessage="feedback online"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  </EuiFlexItem>
);
