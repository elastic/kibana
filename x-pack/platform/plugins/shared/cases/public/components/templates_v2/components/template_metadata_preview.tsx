/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiBadge, EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import type { CaseSeverity } from '../../../../common/types/domain';
import { SeverityHealth } from '../../severity/config';
import * as commonI18n from '../../../common/translations';
import { SEVERITY_TITLE } from '../../severity/translations';
import { componentStyles } from './template_metadata_preview.styles';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateMetadataPreviewProps {
  parsedTemplate: ParsedTemplateDefinition;
}

export const TemplateMetadataPreview: FC<TemplateMetadataPreviewProps> = ({ parsedTemplate }) => {
  const styles = useMemoCss(componentStyles);
  const { name, description, tags, severity, category } = parsedTemplate;
  const { euiTheme } = useEuiTheme();
  return (
    <dl css={styles.list}>
      <MetadataRow label={commonI18n.NAME}>
        <EuiText size="s">{name}</EuiText>
      </MetadataRow>

      {description && (
        <MetadataRow label={commonI18n.DESCRIPTION}>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </MetadataRow>
      )}

      {severity && (
        <MetadataRow label={SEVERITY_TITLE}>
          <SeverityHealth severity={severity as CaseSeverity} />
        </MetadataRow>
      )}

      {category && (
        <MetadataRow label={commonI18n.CATEGORY}>
          <EuiText size="s">{category}</EuiText>
        </MetadataRow>
      )}

      {tags && tags.length > 0 && (
        <MetadataRow label={commonI18n.TAGS}>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
            {tags.map((tag, i) => (
              <EuiBadge
                css={css`
                  max-width: 100px;
                  border-radius: ${euiTheme.border.radius.small};
                `}
                color="hollow"
                key={`${tag}-${i}`}
                data-test-subj={`template-column-tag-${tag}`}
              >
                {tag}
              </EuiBadge>
            ))}
          </EuiFlexGroup>
        </MetadataRow>
      )}
    </dl>
  );
};

TemplateMetadataPreview.displayName = 'TemplateMetadataPreview';

const MetadataRow: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
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
