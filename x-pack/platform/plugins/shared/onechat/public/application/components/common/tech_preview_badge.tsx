/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const techPreviewLabel = i18n.translate('xpack.onechat.techPreviewLabel', {
  defaultMessage: 'Tech preview',
});

export const TechPreviewBadge: React.FC<{ iconOnly?: boolean }> = ({ iconOnly = false }) => {
  return <EuiBetaBadge iconType={iconOnly ? 'flask' : undefined} label={techPreviewLabel} />;
};
