/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const ConnectorsTab = () => (
  <EuiEmptyPrompt
    iconType="plugs"
    titleSize="xs"
    data-test-subj="contextConnectorsPlaceholder"
    title={
      <h3>
        {i18n.translate('xpack.contextEngine.sourcePicker.connectors.placeholderTitle', {
          defaultMessage: 'Connectors coming soon',
        })}
      </h3>
    }
    body={
      <p>
        {i18n.translate('xpack.contextEngine.sourcePicker.connectors.placeholderBody', {
          defaultMessage: 'Support for adding connectors as a source is not available yet.',
        })}
      </p>
    }
  />
);
