/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiText } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { componentStyles } from './template_metadata_preview.styles';

/**
 * A single label/value row for the template preview metadata list (`<dl>`). Its own module so both
 * `TemplateMetadataPreview` and `TemplateConnectorPreview` can reuse it without a circular import.
 */
export const MetadataRow: FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => {
  const styles = useMemoCss(componentStyles);

  return (
    <div css={styles.row}>
      <dt>
        <EuiText size="xs" color="subdued">
          <strong>{label}</strong>
        </EuiText>
      </dt>
      <dd css={styles.value}>{children}</dd>
    </div>
  );
};

MetadataRow.displayName = 'MetadataRow';
