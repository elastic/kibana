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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { ErrorState } from './error_state';
import { EmptyState } from './empty_state';

interface SelectTemplateStepProps {
  templates: IndexTemplate[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateName: string | null) => void;
  onTemplateConfirm: (templateName: string) => void;
  onCreateTemplate: () => void;
  hasErrorLoadingTemplates?: boolean;
  onRetryLoadTemplates: () => void;
}

export const SelectTemplateStep = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateConfirm,
  onCreateTemplate,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
}: SelectTemplateStepProps) => {
  const { euiTheme } = useEuiTheme();

  const selectableOptions = useMemo(
    () =>
      templates.map((template) => {
        return {
          label: template.name,
          checked: template.name === selectedTemplate ? 'on' : undefined,
          'data-test-subj': `template-option-${template.name}`,
          template,
        } as EuiSelectableOption<{ template: IndexTemplate }>;
      }),
    [templates, selectedTemplate]
  );

  const renderOption = (option: EuiSelectableOption<{ template: IndexTemplate }>) => {
    const templateData = option?.template;
    const isManaged = templateData?._kbnMeta?.type === 'managed';

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{option.label}</EuiFlexItem>
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
      const templateName = selected?.label ?? null;
      onTemplateSelect(templateName);

      // Auto-advance to next step when a template is selected
      if (templateName) {
        onTemplateConfirm(templateName);
      }
    },
    [onTemplateSelect, onTemplateConfirm]
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
