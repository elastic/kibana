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
import { useAgentBuilderServices } from '../../../../hooks/use_agent_builder_service';

const labels = {
  learnMore: i18n.translate('xpack.agentBuilder.round.error.contextExceeded.learnMore', {
    defaultMessage: 'Learn more',
  }),
};

export const ContextExceededRoundError: React.FC = () => {
  const { docLinksService } = useAgentBuilderServices();

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="agentBuilderRoundErrorContextExceeded"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.round.error.contextExceeded.description"
              defaultMessage="This conversation exceeded the maximum context length. This typically occurs when tools return a very large response. Try again with a different request or start a new conversation. {docsLink}."
              values={{
                docsLink: (
                  <EuiLink
                    href={docLinksService.limitationsKnownIssuesConversationLengthExceeded}
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
};
