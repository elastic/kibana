/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

export const ModelInfoCallout = () => (
  <KbnInfoCallout
    size="s"
    announceOnMount={false}
    data-test-subj="modelDetailFlyoutPreviewCallout"
    title={i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.previewTitle', {
      defaultMessage: 'Model is still in Technical Preview and not recommended for production use.',
    })}
  />
);
