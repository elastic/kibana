/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getFieldRowGridColumns } from './field_definition_row';
import * as i18n from '../translations';

/**
 * Column headers for a field-definition group.
 *
 * The rows already line up; without headers that alignment reads as coincidence rather than as
 * columns, and the reader has to infer what the second and third values in each row mean.
 */
export const FieldDefinitionRowHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const styles = useMemo(
    () => ({
      header: css`
        display: grid;
        grid-template-columns: ${getFieldRowGridColumns(euiTheme)};
        align-items: center;
        gap: ${euiTheme.size.m};
        padding: 0 ${euiTheme.size.s} ${euiTheme.size.xs};
      `,
      label: css`
        font-weight: ${euiTheme.font.weight.semiBold};
        text-transform: uppercase;
        letter-spacing: 0.05em;
      `,
    }),
    [euiTheme]
  );

  return (
    <div css={styles.header} data-test-subj="fieldDefinitionRowHeader">
      <span />
      <EuiText size="xs" color="subdued" css={styles.label}>
        {i18n.LABEL_COLUMN}
      </EuiText>
      <EuiText size="xs" color="subdued" css={styles.label}>
        {i18n.NAME_COLUMN}
      </EuiText>
      <EuiText size="xs" color="subdued" css={styles.label}>
        {i18n.DESCRIPTION_COLUMN}
      </EuiText>
      <EuiText size="xs" color="subdued" css={styles.label}>
        {i18n.CONTROL_TYPE_COLUMN}
      </EuiText>
      <span />
      <span />
    </div>
  );
};

FieldDefinitionRowHeader.displayName = 'FieldDefinitionRowHeader';
