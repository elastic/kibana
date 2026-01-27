/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

export function EnableAIFeaturesLink() {
  const {
    core: { http },
  } = useKibana();

  return (
    <EuiToolTip
      content={i18n.translate('xpack.streams.enableAIFeaturesLink.tooltipContent', {
        defaultMessage:
          'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
      })}
    >
      <EuiLink
        target="_blank"
        href={http.basePath.prepend(
          `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
        )}
      >
        {i18n.translate('xpack.streams.enableAIFeaturesLink.linkLabel', {
          defaultMessage: 'Enable AI Assistant features',
        })}
      </EuiLink>
    </EuiToolTip>
  );
}
