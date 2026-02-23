/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiLoadingElastic } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RoundIconProps {
  isLoading: boolean;
}

const labels = {
  loading: i18n.translate('xpack.agentBuilder.round.icon.loading', {
    defaultMessage: 'Round is loading',
  }),
  content: i18n.translate('xpack.agentBuilder.round.icon.content', {
    defaultMessage: 'Round content',
  }),
};

export const RoundIcon: React.FC<RoundIconProps> = ({ isLoading }) => {
  if (isLoading) {
    return <EuiLoadingElastic size="m" aria-label={labels.loading} />;
  }
  return <EuiIcon type="sparkles" aria-label={labels.content} size="m" />;
};
