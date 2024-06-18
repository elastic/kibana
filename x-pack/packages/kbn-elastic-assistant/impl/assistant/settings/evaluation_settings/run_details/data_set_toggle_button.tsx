/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import * as i18n from './translations';

interface Props {
  useLangSmithDataset: boolean;
  onUseLangSmith: () => void;
  onUseCustom: () => void;
}

export const DatasetToggleButton: React.FC<Props> = React.memo(
  ({ useLangSmithDataset, onUseLangSmith, onUseCustom }) => {
    return (
      <EuiText
        size={'xs'}
        css={css`
          margin-top: 16px;
        `}
      >
        {i18n.EVALUATOR_DATASET_LABEL}
        {' ('}
        <EuiLink color={useLangSmithDataset ? 'primary' : 'text'} onClick={() => onUseLangSmith()}>
          {i18n.LANGSMITH_DATASET_LABEL}
        </EuiLink>
        {' / '}
        <EuiLink color={useLangSmithDataset ? 'text' : 'primary'} onClick={() => onUseCustom()}>
          {i18n.CUSTOM_DATASET_LABEL}
        </EuiLink>
        {')'}
      </EuiText>
    );
  }
);

DatasetToggleButton.displayName = 'DatasetToggleButton';
