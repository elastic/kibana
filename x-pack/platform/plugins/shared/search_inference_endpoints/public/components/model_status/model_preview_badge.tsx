/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ModelPreviewProps {
  id: string;
}

export const ModelPreviewBadge = ({ id }: ModelPreviewProps) => {
  return (
    <EuiBadge color="primary" data-test-subj={`modelPreviewBadge-${id}`}>
      {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.previewStatusBadge.content', {
        defaultMessage: 'Preview',
      })}
    </EuiBadge>
  );
};
