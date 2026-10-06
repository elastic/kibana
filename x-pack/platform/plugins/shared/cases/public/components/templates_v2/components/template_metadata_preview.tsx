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
import { ConnectorTypes } from '../../../../common/types/domain';
import { SeverityHealth } from '../../severity/config';
import { useCasesFeatures } from '../../../common/use_cases_features';
import * as commonI18n from '../../../common/translations';
import * as i18n from '../translations';
import { SEVERITY_TITLE } from '../../severity/translations';
import { componentStyles } from './template_metadata_preview.styles';
import { MetadataRow } from './metadata_row';
import { TemplateConnectorPreview } from './template_connector_preview';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateMetadataPreviewProps {
  parsedTemplate: ParsedTemplateDefinition;
  showCaseDefaults?: boolean;
}

// Case-default rows (title, description, severity, category, tags, assignees). Extracted so the
// parent gates them with a single `showCaseDefaults` check and each function stays within the
// complexity budget.
const CaseDefaultsPreviewRows: FC<{ parsedTemplate: ParsedTemplateDefinition }> = ({
  parsedTemplate,
}) => {
  const { euiTheme } = useEuiTheme();
  const { name, description, tags, severity, category, assignees } = parsedTemplate;

  return (
    <>
      {name && (
        <MetadataRow label={i18n.CASE_DEFAULT_TITLE}>
          <EuiText size="s">{name}</EuiText>
        </MetadataRow>
      )}

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

      {assignees && assignees.length > 0 && (
        <MetadataRow label={i18n.CASE_DEFAULT_ASSIGNEES}>
          <EuiText size="s" color="subdued">
            {assignees.map((assignee) => assignee.uid).join(', ')}
          </EuiText>
        </MetadataRow>
      )}
    </>
  );
};

CaseDefaultsPreviewRows.displayName = 'CaseDefaultsPreviewRows';

export const TemplateMetadataPreview: FC<TemplateMetadataPreviewProps> = ({
  parsedTemplate,
  showCaseDefaults = true,
}) => {
  const styles = useMemoCss(componentStyles);
  const { settings, connector } = parsedTemplate;
  // Hidden where alert syncing is not a feature (e.g. Observability), matching the editor form.
  const { isSyncAlertsEnabled } = useCasesFeatures();

  return (
    <dl css={styles.list}>
      {showCaseDefaults && <CaseDefaultsPreviewRows parsedTemplate={parsedTemplate} />}

      {isSyncAlertsEnabled && settings?.syncAlerts !== undefined && (
        <MetadataRow label={commonI18n.SYNC_ALERTS}>
          <EuiText size="s">
            {settings.syncAlerts
              ? commonI18n.SYNC_ALERTS_SWITCH_LABEL_ON
              : commonI18n.SYNC_ALERTS_SWITCH_LABEL_OFF}
          </EuiText>
        </MetadataRow>
      )}

      {settings?.extractObservables !== undefined && (
        <MetadataRow label={commonI18n.EXTRACT_OBSERVABLES_LABEL}>
          <EuiText size="s">
            {settings.extractObservables
              ? commonI18n.EXTRACT_OBSERVABLES_SWITCH_LABEL_ON
              : commonI18n.EXTRACT_OBSERVABLES_SWITCH_LABEL_OFF}
          </EuiText>
        </MetadataRow>
      )}

      {connector && connector.type !== ConnectorTypes.none && (
        <TemplateConnectorPreview connector={connector} />
      )}
    </dl>
  );
};

TemplateMetadataPreview.displayName = 'TemplateMetadataPreview';
