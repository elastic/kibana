/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLink } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../../../common/doc_links';

const labels = {
  description: i18n.translate('xpack.onechat.round.error.contextExceeded.description', {
    defaultMessage:
      'This conversation exceeded the maximum context length. This typically occurs when tools return a very large response. Try again with a different request or start a new conversation. {docsLink}.',
  }),
  learnMore: i18n.translate('xpack.onechat.round.error.contextExceeded.learnMore', {
    defaultMessage: 'Learn more',
  }),
};

export const ContextExceededRoundError: React.FC = () => (
  <EuiFlexGroup
    direction="column"
    gutterSize="s"
    data-test-subj="agentBuilderRoundErrorContextExceeded"
  >
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.onechat.round.error.contextExceeded.description"
            defaultMessage={labels.description}
            values={{
              docsLink: (
                <EuiLink
                  href={`${docLinks.limitationsKnownIssues}#conversation-length-exceeded`}
                  external
                  target="_blank"
                >
                  {labels.learnMore}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
