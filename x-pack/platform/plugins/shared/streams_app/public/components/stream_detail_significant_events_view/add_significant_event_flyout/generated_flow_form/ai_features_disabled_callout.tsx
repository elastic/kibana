/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';

export function AIFeaturesDisabledCallout({ couldBeEnabled }: { couldBeEnabled: boolean }) {
  const {
    core: { http },
  } = useKibana();

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabledTooltip',
            {
              defaultMessage:
                'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
            }
          )}
        >
          {couldBeEnabled ? (
            <EuiLink
              target="_blank"
              href={http.basePath.prepend(
                `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
              )}
            >
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabled',
                {
                  defaultMessage: 'Enable AI Assistant features',
                }
              )}
            </EuiLink>
          ) : (
            <EuiText>
              <h3>
                {i18n.translate(
                  'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabledAskAdmin',
                  { defaultMessage: 'Ask your administrator to enable AI Assistant features' }
                )}
              </h3>
            </EuiText>
          )}
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
