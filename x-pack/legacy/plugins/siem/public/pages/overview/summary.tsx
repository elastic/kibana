/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../lib/kibana';

export const Summary = React.memo(() => {
  const docLinks = useKibana().services.docLinks;

  return (
    <EuiFlexItem>
      <EuiText>
        <h2>
          <FormattedMessage
            defaultMessage="Getting started"
            id="xpack.siem.overview.startedTitle"
          />
        </h2>

        <p>
          <FormattedMessage
            defaultMessage="Welcome to Security Information &amp; Event Management (SIEM). Get started by reviewing our {docs} or {data}. For information about upcoming features and tutorials, be sure to check out our {siemSolution} page."
            id="xpack.siem.overview.startedText"
            values={{
              docs: (
                <EuiLink href={docLinks.links.siem} target="blank">
                  <FormattedMessage
                    defaultMessage="documentation"
                    id="xpack.siem.overview.startedText.docsLinkText"
                  />
                </EuiLink>
              ),
              data: (
                <EuiLink href="kibana#home/tutorial_directory/siem">
                  <FormattedMessage
                    defaultMessage="ingesting data"
                    id="xpack.siem.overview.startedText.dataLinkText"
                  />
                </EuiLink>
              ),
              siemSolution: (
                <EuiLink href="https://www.elastic.co/solutions/siem" target="blank">
                  <FormattedMessage
                    defaultMessage="SIEM solution"
                    id="xpack.siem.overview.startedText.siemSolutionLinkText"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>

        <h2>
          <FormattedMessage defaultMessage="Feedback" id="xpack.siem.overview.feedbackTitle" />
        </h2>

        <p>
          <FormattedMessage
            defaultMessage="If you have input or suggestions regarding your experience with Elastic SIEM, please feel free to {feedback}."
            id="xpack.siem.overview.feedbackText"
            values={{
              feedback: (
                <EuiLink href="https://discuss.elastic.co/c/siem" target="blank">
                  <FormattedMessage
                    defaultMessage="submit feedback online"
                    id="xpack.siem.overview.feedbackText.feedbackLinkText"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </EuiFlexItem>
  );
});

Summary.displayName = 'Summary';
