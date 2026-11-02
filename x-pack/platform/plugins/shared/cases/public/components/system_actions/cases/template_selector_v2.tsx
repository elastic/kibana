/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { OptionalFieldLabel } from '../../optional_field_label';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import {
  DEFAULT_EMPTY_TEMPLATE_NAME,
  TEMPLATE_HELP_TEXT,
  TEMPLATE_LABEL,
  TEMPLATE_SELECT_PLACEHOLDER,
} from '../../create/translations';

/** Minimal legacy (v1) template shape needed to bridge a stored legacy key to its migrated name. */
export interface LegacyTemplateRef {
  key: string;
  name: string;
}

/**
 * Resolve a stored `templateId` (which may be a legacy v1 key) to the matching v2 template.
 * Mirrors the three-step bridge used by the server-side connector executor so that the UI and
 * rule execution always agree on which template is selected.
 */
export const findV2Template = (
  templateId: string | null,
  v2Templates: TemplateListItem[],
  legacyTemplates?: LegacyTemplateRef[]
): TemplateListItem | undefined => {
  if (!templateId) return undefined;
  const byTemplateId = v2Templates.find((t) => t.templateId === templateId);
  if (byTemplateId) return byTemplateId;
  // Prefer the exact v1 lineage recorded by the migration (`legacyKey`).
  const byLegacyKey = v2Templates.find((t) => t.legacyKey === templateId);
  if (byLegacyKey) return byLegacyKey;
  // Fallback: match by normalised name for environments migrated before `legacyKey` was recorded.
  const legacyName = legacyTemplates?.find((t) => t.key === templateId)?.name;
  if (legacyName) {
    const normalized = legacyName.trim().toLocaleLowerCase();
    return v2Templates.find((t) => t.name.trim().toLocaleLowerCase() === normalized);
  }
  return undefined;
};

interface Props {
  templateId: string | null;
  /** v2 templates fetched by the parent; the parent owns the single query observer. */
  templates: TemplateListItem[];
  isLoadingTemplates: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  /**
   * Legacy (v1) configure templates for this owner. Used only to display a rule that still stores a
   * legacy template `key`: the key is bridged to the migrated v2 template by name so the selector
   * shows it instead of appearing empty. Display-only — the stored value is not rewritten.
   */
  legacyTemplates?: LegacyTemplateRef[];
  onChange: (params: { templateId: string | null; templateVersion: string | null }) => void;
}

const EMPTY_VALUE = '';

const TemplateSelectorV2Component: React.FC<Props> = ({
  templateId,
  templates,
  isLoadingTemplates,
  isLoading = false,
  isDisabled = false,
  legacyTemplates,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => [
      { label: DEFAULT_EMPTY_TEMPLATE_NAME, value: EMPTY_VALUE },
      ...templates.map((template) => ({
        key: template.templateId,
        label: template.name,
        value: template.templateId,
      })),
    ],
    [templates]
  );

  // A rule authored before the v2 migration stores the legacy template `key`, which never matches a
  // v2 `templateId`. Bridge it to the migrated template so it still displays. The stored value stays
  // the legacy key until the user actively picks a template (the connector resolves it at runtime),
  // preserving the deprecated v1 path until it is removed.
  const effectiveTemplateId = useMemo(
    () => findV2Template(templateId, templates, legacyTemplates)?.templateId ?? null,
    [templateId, templates, legacyTemplates]
  );

  const selectedOptions = useMemo(
    () =>
      effectiveTemplateId
        ? options.filter((opt) => opt.value === effectiveTemplateId)
        : [{ label: DEFAULT_EMPTY_TEMPLATE_NAME, value: EMPTY_VALUE }],
    [options, effectiveTemplateId]
  );

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      const selection = selected[0] ?? null;
      const selectedValue = selection?.value ?? EMPTY_VALUE;

      if (!selectedValue) {
        onChange({ templateId: null, templateVersion: null });
        return;
      }

      const matched = templates.find((t) => t.templateId === selectedValue);

      onChange({
        templateId: selectedValue,
        templateVersion: matched?.templateVersion != null ? String(matched.templateVersion) : null,
      });
    },
    [onChange, templates]
  );

  return (
    <EuiFormRow
      id="casesConnectorTemplateV2"
      fullWidth
      label={TEMPLATE_LABEL}
      labelAppend={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          css={css`
            flex-grow: 0;
          `}
          responsive={false}
        >
          <EuiFlexItem grow={false}>{OptionalFieldLabel}</EuiFlexItem>
        </EuiFlexGroup>
      }
      helpText={TEMPLATE_HELP_TEXT}
    >
      {isLoadingTemplates ? (
        <EuiSkeletonRectangle width="100%" height={euiTheme.size.xxl} borderRadius="m" />
      ) : (
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          placeholder={TEMPLATE_SELECT_PLACEHOLDER}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          isLoading={isLoading}
          isDisabled={isLoading || isDisabled}
          data-test-subj="cases-connector-template-v2-select"
        />
      )}
    </EuiFormRow>
  );
};

TemplateSelectorV2Component.displayName = 'TemplateSelectorV2';

export const TemplateSelectorV2 = memo(TemplateSelectorV2Component);
