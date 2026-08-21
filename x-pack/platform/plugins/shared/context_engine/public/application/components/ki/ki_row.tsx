/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import React from 'react';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { capitalizeLabel, getKiTypeLabel } from './helpers';

interface KiRowProps {
  ki: KiListItem;
}

export const KiRow = ({ ki }: KiRowProps) => {
  const typeLabel = capitalizeLabel(getKiTypeLabel(ki.type));

  return (
    <div data-test-subj="contextKiRow">
      <EuiTitle size="xxs">
        <EuiTextBlockTruncate lines={2} cloneElement>
          <h4 data-test-subj="contextKiRowTitle">{ki.title}</h4>
        </EuiTextBlockTruncate>
      </EuiTitle>
      <EuiText size="xs" color="subdued" data-test-subj="contextKiRowType">
        <p>{typeLabel}</p>
      </EuiText>
    </div>
  );
};
