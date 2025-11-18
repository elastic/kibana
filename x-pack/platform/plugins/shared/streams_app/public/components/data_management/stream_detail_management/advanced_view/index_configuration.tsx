/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiText } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { Settings } from './settings';

export function IndexConfiguration({
  definition,
  refreshDefinition,
  children,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
  children?: React.ReactNode;
}) {
  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>
            {i18n.translate('xpack.streams.streamAdvancedView.indexConfiguration', {
              defaultMessage: 'Index Configuration',
            })}
          </h3>
        </EuiText>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <Settings definition={definition} refreshDefinition={refreshDefinition}>
          {children}
        </Settings>
      </EuiPanel>
    </EuiPanel>
  );
}
