/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { formatKiTypeLabel } from '../../../utils/ki_display';

const noneValueLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.noneValue', {
  defaultMessage: 'None',
});

export const kiLabelCapitalizeCss = css`
  text-transform: capitalize;
`;

interface KiTypeDisplayProps {
  type?: string;
  as: 'text' | 'badge';
  'data-test-subj'?: string;
}

export const KiTypeDisplay = ({ type, as, 'data-test-subj': dataTestSubj }: KiTypeDisplayProps) => {
  const hasType = typeof type === 'string' && type.length > 0;
  const content = hasType ? formatKiTypeLabel(type) : noneValueLabel;

  if (as === 'badge') {
    if (!hasType) {
      return null;
    }
    return (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj} css={kiLabelCapitalizeCss}>
        {content}
      </EuiBadge>
    );
  }

  return (
    <EuiText
      size="s"
      color="subdued"
      data-test-subj={dataTestSubj}
      css={hasType ? kiLabelCapitalizeCss : undefined}
    >
      {content}
    </EuiText>
  );
};
