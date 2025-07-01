/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import {
  getConnectorsManagementHref,
  useElasticLlmCalloutDismissed,
  ElasticLlmCalloutKey,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '../hooks/use_kibana';

export const ElasticLlmConversationCallout = () => {
  const { http, docLinks } = useKibana().services;

  const { euiTheme } = useEuiTheme();

  const [dismissed, setDismissed] = useElasticLlmCalloutDismissed(
    ElasticLlmCalloutKey.CONVERSATION_CALLOUT
  );

  const onDismiss = () => {
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  const elasticLlmCalloutClassName = css`
    margin-bottom: ${euiTheme.size.s};
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;
  `;

  return (
    <EuiCallOut
      onDismiss={onDismiss}
      iconType="info"
      title={i18n.translate('xpack.aiAssistant.elasticLlmCallout.title', {
        defaultMessage: `You're using the Elastic Managed LLM connector`,
      })}
      size="s"
      className={elasticLlmCalloutClassName}
    >
      <p>
        <FormattedMessage
          id="xpack.aiAssistant.tour.elasticLlmDescription"
          defaultMessage="Elastic AI Assistant and other AI features are powered by an LLM. The Elastic Managed LLM connector is used by default (<costLink>additional costs incur</costLink>) when no custom connectors are available. You can configure a <connectorLink>custom connector</connectorLink> if you prefer."
          values={{
            costLink: (...chunks: React.ReactNode[]) => (
              <EuiLink
                href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                {chunks}
              </EuiLink>
            ),
            connectorLink: (...chunks: React.ReactNode[]) => (
              <EuiLink
                href={getConnectorsManagementHref(http!)}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                {chunks}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
