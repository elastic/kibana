/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSkeletonRectangle, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const AutomationsPanel = () => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiTitle size="s">
      <h2>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.title', {
          defaultMessage: 'Automations',
        })}
      </h2>
    </EuiTitle>
    <EuiSpacer size="s" />
    <EuiText size="s" color="subdued">
      <p>
        {i18n.translate('xpack.contextEngine.aiIndexDetail.automations.description', {
          defaultMessage:
            "Automations extract and refresh this AI index's Knowledge Indicators from its sources.",
        })}
      </p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiSkeletonRectangle width="100%" height={88} borderRadius="m" />
  </EuiPanel>
);
