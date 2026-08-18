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
import { useGetTemplates } from '../../templates_v2/hooks/use_get_templates';
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

interface Props {
  owner: string;
  templateId: string | null;
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
  owner,
  templateId,
  isLoading = false,
  isDisabled = false,
  legacyTemplates,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();

  const { data: templatesData, isLoading: isLoadingTemplates } = useGetTemplates({
    queryParams: { page: 1, perPage: 10000, owner: [owner], isEnabled: true },
  });

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => [
      { label: DEFAULT_EMPTY_TEMPLATE_NAME, value: EMPTY_VALUE },
      ...(templatesData?.templates ?? []).map((template) => ({
        key: template.templateId,
        label: template.name,
        value: template.templateId,
      })),
    ],
    [templatesData?.templates]
  );

  // A rule authored before the v2 migration stores the legacy template `key`, which never matches a
  // v2 `templateId`. Bridge it to the migrated template so it still displays. The stored value stays
  // the legacy key until the user actively picks a template (the connector resolves it at runtime),
  // preserving the deprecated v1 path until it is removed.
  const effectiveTemplateId = useMemo(() => {
    if (!templateId) {
      return null;
    }
    const v2Templates = templatesData?.templates ?? [];
    if (v2Templates.some((template) => template.templateId === templateId)) {
      return templateId;
    }
    // Prefer the exact v1 lineage recorded by the migration (`legacyKey`). v1 keyed identity on
    // `key`, not name, so this disambiguates v1 templates that shared a name — and mirrors the
    // server-side connector bridge (`resolveV2TemplateForLegacyKey`).
    const byLegacyKey = v2Templates.find((template) => template.legacyKey === templateId);
    if (byLegacyKey) {
      return byLegacyKey.templateId;
    }
    // Fallback for environments migrated before `legacyKey` was recorded: match by normalized name
    // (case/whitespace-insensitive, mirroring the template-name uniqueness rule).
    const legacyName = legacyTemplates?.find((template) => template.key === templateId)?.name;
    if (legacyName) {
      const normalizedLegacyName = legacyName.trim().toLocaleLowerCase();
      return (
        v2Templates.find(
          (template) => template.name.trim().toLocaleLowerCase() === normalizedLegacyName
        )?.templateId ?? null
      );
    }
    return null;
  }, [templateId, templatesData?.templates, legacyTemplates]);

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

      const matched = (templatesData?.templates ?? []).find((t) => t.templateId === selectedValue);

      onChange({
        templateId: selectedValue,
        templateVersion: matched?.templateVersion != null ? String(matched.templateVersion) : null,
      });
    },
    [onChange, templatesData?.templates]
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
