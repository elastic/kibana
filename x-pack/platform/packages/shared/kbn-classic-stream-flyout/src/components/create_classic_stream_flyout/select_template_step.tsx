/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiSpacer,
  EuiSelectable,
  type EuiSelectableOption,
  EuiBadge,
  EuiEmptyPrompt,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { TemplateDeserialized } from '@kbn/index-management-plugin/common/types';
import { css } from '@emotion/react';

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

const flexGroupStyles = css({
  padding: 24,
});

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
  const selectableOptions = useMemo(
    () =>
      templates.map((template) => {
        const hasIlmPolicy = Boolean(template.ilmPolicy?.name);
        const dataRetention = !hasIlmPolicy ? formatDataRetention(template) : undefined;

        return {
          label: template.name,
          checked: template.name === selectedTemplate ? 'on' : undefined,
          'data-test-subj': `template-option-${template.name}`,
          data: { template },
          append: hasIlmPolicy ? (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {template.ilmPolicy!.name}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">ILM</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : dataRetention ? (
            <EuiText size="s" color="subdued">
              {dataRetention}
            </EuiText>
          ) : undefined,
        };
      }),
    [templates, selectedTemplate]
  );

  const renderOption = (option: EuiSelectableOption<{ template: TemplateDeserialized }>) => {
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

  const handleTemplateChange = (newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((option) => option.checked === 'on');
    onTemplateSelect(selected?.label ?? null);
  };

  if (hasErrorLoadingTemplates) {
    return (
      <EuiFlexGroup
        data-test-subj="selectTemplateStep"
        direction="column"
        alignItems="center"
        justifyContent="center"
        css={flexGroupStyles}
      >
        <EuiCallOut
          title={i18n.translate(
            'xpack.createClassicStreamFlyout.selectTemplateStep.errorState.title',
            {
              defaultMessage: "Uh-oh, we weren't able to fetch your index templates",
            }
          )}
          color="warning"
          iconType="warning"
          announceOnMount
          data-test-subj="errorLoadingTemplates"
        >
          <p>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.body"
              defaultMessage="Don't worry, it's not your fault. Something has gone wrong on our end. Give it a moment and then try again to fetch the available index templates."
            />
          </p>
          <EuiButton
            color="warning"
            onClick={onRetryLoadTemplates}
            data-test-subj="retryLoadTemplatesButton"
          >
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.retryButton"
              defaultMessage="Retry"
            />
          </EuiButton>
        </EuiCallOut>
      </EuiFlexGroup>
    );
  }

  if (templates.length === 0) {
    return (
      <EuiFlexGroup
        data-test-subj="selectTemplateStep"
        direction="column"
        alignItems="center"
        justifyContent="center"
        css={flexGroupStyles}
      >
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.title"
                defaultMessage="No index templates detected"
              />
            </h2>
          }
          titleSize="s"
          body={
            <p>
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.body"
                defaultMessage="To create a new classic stream, you must select an index template that will be used to set the initial settings for to the new stream. Currently, you don’t have any index templates. Create a new index template first, then return here to create a classic stream."
              />
            </p>
          }
          actions={
            <EuiButton
              color="primary"
              onClick={onCreateTemplate}
              data-test-subj="createTemplateButton"
            >
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.createButton"
                defaultMessage="Create index template"
              />
            </EuiButton>
          }
        />
      </EuiFlexGroup>
    );
  }

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
              defaultMessage: 'Search by index template name...',
            }
          ),
          'data-test-subj': 'templateSearch',
          compressed: true,
        }}
        singleSelection={true}
        options={selectableOptions}
        onChange={handleTemplateChange}
        renderOption={renderOption}
        listProps={{
          bordered: true,
          paddingSize: 's',
          onFocusBadge: false,
        }}
        height="full"
      >
        {(list, search) => (
          <>
            <div style={{ paddingLeft: '24px', paddingRight: '24px' }}>
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
