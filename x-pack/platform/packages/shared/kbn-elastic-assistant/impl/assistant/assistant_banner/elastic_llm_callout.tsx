/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, useEuiTheme } from '@elastic/eui';
import { useAssistantContext } from '../../assistant_context';
import { useAssistantSpaceId } from '../use_space_aware_context';
import { NEW_FEATURES_TOUR_STORAGE_KEYS } from '../../tour/const';

export const ElasticLlmCallout = ({ showEISCallout }: { showEISCallout: boolean }) => {
  const {
    getUrlForApp,
    docLinks: { ELASTIC_LLM_USAGE_COST_LINK },
  } = useAssistantContext();
  const spaceId = useAssistantSpaceId();
  const { euiTheme } = useEuiTheme();
  const [tourCompleted, setTourCompleted] = useLocalStorage<boolean>(
    NEW_FEATURES_TOUR_STORAGE_KEYS.CONVERSATION_CONNECTOR_ELASTIC_LLM,
    false
  );
  const [showCallOut, setShowCallOut] = useState<boolean>(showEISCallout);

  const onDismiss = useCallback(() => {
    setShowCallOut(false);
    setTourCompleted(true);
  }, [setTourCompleted]);

  useEffect(() => {
    if (showEISCallout && !tourCompleted) {
      setShowCallOut(true);
    } else {
      setShowCallOut(false);
    }
  }, [showEISCallout, tourCompleted]);

  if (!showCallOut) {
    return;
  }

  return (
    <EuiCallOut
      onDismiss={onDismiss}
      iconType="iInCircle"
      title={i18n.translate('xpack.elasticAssistant.assistant.connectors.elasticLlmCallout.title', {
        defaultMessage: 'You are now using the Elastic-managed LLM connector',
      })}
      size="s"
      css={css`
        padding: ${euiTheme.size.s} !important;
      `}
    >
      <p>
        <FormattedMessage
          id="xpack.elasticAssistant.assistant.connectors.tour.elasticLlmDescription"
          defaultMessage="A large language model (LLM) is required to power the AI Assistant and AI-driven features in Elastic. By default, Elastic uses its Elastic-managed LLM connector ({costLink}) when no custom connectors are available. You can always configure and use your own {connectorLink} and change the default in {settingsLink}."
          values={{
            costLink: (
              <EuiLink
                href={ELASTIC_LLM_USAGE_COST_LINK}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                {
                  <FormattedMessage
                    id="xpack.elasticAssistant.assistant.eisCallout.extraCost.label"
                    defaultMessage="additional costs incur"
                  />
                }
              </EuiLink>
            ),
            connectorLink: (
              <EuiLink
                href={getUrlForApp('management', {
                  path: `/insightsAndAlerting/triggersActionsConnectors/connectors`,
                })}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                <FormattedMessage
                  id="xpack.elasticAssistant.assistant.eisCallout.connector.label"
                  defaultMessage="connector"
                />
              </EuiLink>
            ),
            settingsLink: (
              <EuiLink
                href={getUrlForApp('management', {
                  path: `/kibana/spaces/edit/${spaceId}`,
                })}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                <FormattedMessage
                  id="xpack.elasticAssistant.assistant.eisCallout.settings.label"
                  defaultMessage="Settings"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
