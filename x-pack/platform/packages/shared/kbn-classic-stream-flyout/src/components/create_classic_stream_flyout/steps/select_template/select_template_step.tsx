/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiSpacer,
  EuiSelectable,
  type EuiSelectableOption,
  EuiBadge,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useEuiTheme,
  EuiTextTruncate,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import { ErrorState } from './error_state';
import { EmptyState } from './empty_state';

const formatDataRetention = (template: TemplateDeserialized): string | undefined => {
  const { lifecycle } = template;

  if (!lifecycle?.enabled) {
    return undefined;
  }

  if (lifecycle.infiniteDataRetention) {
    return '∞';
  }

  if (lifecycle.value && lifecycle.unit) {
    return `${lifecycle.value}${lifecycle.unit}`;
  }

  return undefined;
};

interface SelectTemplateStepProps {
  templates: TemplateDeserialized[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateName: string | null) => void;
  onCreateTemplate: () => void;
  hasErrorLoadingTemplates?: boolean;
  onRetryLoadTemplates: () => void;
}

export const SelectTemplateStep = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCreateTemplate,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
}: SelectTemplateStepProps) => {
  const { euiTheme } = useEuiTheme();

  const selectableOptions = useMemo(
    () =>
      templates.map((template) => {
        const hasIlmPolicy = Boolean(template.ilmPolicy?.name);
        const dataRetention = !hasIlmPolicy ? formatDataRetention(template) : undefined;

        return {
          label: template.name,
          checked: template.name === selectedTemplate ? 'on' : undefined,
          'data-test-subj': `template-option-${template.name}`,
          template,
          append: hasIlmPolicy ? (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  <EuiTextTruncate text={template.ilmPolicy?.name ?? ''} width={250} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.createClassicStreamFlyout.selectTemplateStep.ilmBadgeLabel',
                    {
                      defaultMessage: 'ILM',
                    }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : dataRetention ? (
            <EuiText size="s" color="subdued">
              {dataRetention}
            </EuiText>
          ) : undefined,
        } as EuiSelectableOption<{ template: TemplateDeserialized }>;
      }),
    [templates, selectedTemplate]
  );

  const renderOption = (option: EuiSelectableOption<{ template: TemplateDeserialized }>) => {
    const templateData = option?.template;
    const isManaged = templateData?._kbnMeta?.type === 'managed';

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTextTruncate text={option.label} width={250} />
        </EuiFlexItem>
        {isManaged && (
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="lock"
              content={i18n.translate(
                'xpack.createClassicStreamFlyout.selectTemplateStep.managedTooltip',
                {
                  defaultMessage: 'Managed',
                }
              )}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  const handleTemplateChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((option) => option.checked === 'on');
      onTemplateSelect(selected?.label ?? null);
    },
    [onTemplateSelect]
  );

  if (hasErrorLoadingTemplates) {
    return <ErrorState onRetryLoadTemplates={onRetryLoadTemplates} />;
  }

  if (templates.length === 0) {
    return <EmptyState onCreateTemplate={onCreateTemplate} />;
  }

  const selectableStyles = css`
    .euiSelectableList {
      border-radius: 0;
    }
  `;

  return (
    <EuiFlexGroup data-test-subj="selectTemplateStep" direction="column">
      <EuiSelectable
        aria-label={i18n.translate('xpack.createClassicStreamFlyout.selectTemplateStep.ariaLabel', {
          defaultMessage: 'Select an index template',
        })}
        searchable
        searchProps={{
          placeholder: i18n.translate(
            'xpack.createClassicStreamFlyout.selectTemplateStep.searchPlaceholder',
            {
              defaultMessage: 'Search by index template name…',
            }
          ),
          'data-test-subj': 'templateSearch',
        }}
        singleSelection={true}
        options={selectableOptions}
        onChange={handleTemplateChange}
        renderOption={renderOption}
        css={selectableStyles}
        listProps={{
          bordered: true,
          paddingSize: 's',
          onFocusBadge: false,
        }}
        height="full"
      >
        {(list, search) => (
          <>
            <div style={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}>
              {search}
              <EuiSpacer size="s" />
            </div>
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiFlexGroup>
  );
};
