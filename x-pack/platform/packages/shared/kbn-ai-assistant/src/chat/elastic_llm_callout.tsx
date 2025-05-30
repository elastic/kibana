/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import { getConnectorsManagementHref } from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '../hooks/use_kibana';

export const ElasticLlmCallout = () => {
  const { http, spaces, application, docLinks } = useKibana().services;

  const { euiTheme } = useEuiTheme();

  const [showCallOut, setShowCallOut] = useState(true);
  const [currentSpaceId, setCurrentSpaceId] = useState('default');

  const onDismiss = () => {
    setShowCallOut(false);
  };

  useEffect(() => {
    const getCurrentSpace = async () => {
      if (spaces) {
        const space = await spaces.getActiveSpace();
        setCurrentSpaceId(space.id);
      }
    };

    getCurrentSpace();
  }, [spaces]);

  if (!showCallOut) {
    return;
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
      iconType="iInCircle"
      title={i18n.translate('xpack.aiAssistant.elasticLlmCallout.title', {
        defaultMessage: 'You are now using the Elastic-managed LLM connector',
      })}
      size="s"
      className={elasticLlmCalloutClassName}
    >
      <p>
        <FormattedMessage
          id="xpack.aiAssistant.tour.elasticLlmDescription"
          defaultMessage="A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. By default, Elastic uses its Elastic-managed LLM connector (<costLink>additional costs incur</costLink>) when no custom connectors are available. You can always configure and use your own <connectorLink>connector</connectorLink> and change the default in <settingsLink>Settings</settingsLink>."
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
            settingsLink: (...chunks: React.ReactNode[]) => (
              <EuiLink
                href={application!.getUrlForApp('management', {
                  path: `/kibana/spaces/edit/${currentSpaceId}`,
                })}
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
