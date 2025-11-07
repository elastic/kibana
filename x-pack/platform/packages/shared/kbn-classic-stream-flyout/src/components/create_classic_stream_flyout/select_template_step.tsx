/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiHorizontalRule,
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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { IndexTemplate } from './create_classic_stream_flyout';

interface SelectTemplateStepProps {
  templates: IndexTemplate[];
  selectedTemplate: string | null;
  onTemplateSelect: (templateName: string | null) => void;
  onCreateTemplate?: () => void;
  isLoadingTemplates?: boolean;
  hasErrorLoadingTemplates?: boolean;
  onRetryLoadTemplates?: () => void;
}

export const SelectTemplateStep: React.FC<SelectTemplateStepProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCreateTemplate,
  isLoadingTemplates = false,
  hasErrorLoadingTemplates = false,
  onRetryLoadTemplates,
}) => {
  const selectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      templates.map((template) => ({
        label: template.name,
        checked: template.name === selectedTemplate ? 'on' : undefined,
        'data-test-subj': `template-option-${template.name}`,
        append: template.ilmPolicy?.name ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {template.ilmPolicy.name}
              </EuiText>
            </EuiFlexItem>
            {template.showIlmBadge && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">ILM</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : undefined,
      })),
    [templates, selectedTemplate]
  );

  const handleTemplateChange = (newOptions: EuiSelectableOption[]) => {
    const selected = newOptions.find((option) => option.checked === 'on');
    onTemplateSelect(selected?.label ?? null);
  };

  // Error state - centered
  if (hasErrorLoadingTemplates) {
    return (
      <EuiFlexGroup
        data-test-subj="selectTemplateStep"
        direction="column"
        gutterSize="none"
        alignItems="center"
        justifyContent="spaceAround"
        style={{ flexGrow: 1 }}
      >
        <EuiCallOut
          title={i18n.translate('xpack.createClassicStreamFlyout.errorState.title', {
            defaultMessage: "Uh-oh, we weren't able to fetch your index templates",
          })}
          color="warning"
          iconType="warning"
          announceOnMount
          data-test-subj="errorLoadingTemplates"
        >
          <p>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.errorState.body"
              defaultMessage="Don't worry, it's not your fault. Something has gone wrong on our end. Give it a moment and then try again to fetch the available index templates."
            />
          </p>
          {onRetryLoadTemplates && (
            <EuiButton
              color="warning"
              onClick={onRetryLoadTemplates}
              data-test-subj="retryLoadTemplatesButton"
            >
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.errorState.retryButton"
                defaultMessage="Retry"
              />
            </EuiButton>
          )}
        </EuiCallOut>
      </EuiFlexGroup>
    );
  }

  // Empty state - centered
  if (templates.length === 0) {
    return (
      <EuiFlexGroup
        data-test-subj="selectTemplateStep"
        direction="column"
        gutterSize="none"
        alignItems="center"
        justifyContent="spaceAround"
        style={{ flexGrow: 1 }}
      >
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.emptyState.title"
                defaultMessage="No index templates detected"
              />
            </h2>
          }
          titleSize="s"
          body={
            <p>
              <FormattedMessage
                id="xpack.createClassicStreamFlyout.emptyState.body"
                defaultMessage="To create a new classic stream, you must select an index template that will be used to set the initial settings for to the new stream. Currently, you don't have any index templates. Create a new index template first, then return here to create a classic stream."
              />
            </p>
          }
          actions={
            onCreateTemplate && (
              <EuiButton
                color="primary"
                onClick={onCreateTemplate}
                data-test-subj="createTemplateButton"
              >
                <FormattedMessage
                  id="xpack.createClassicStreamFlyout.emptyState.createButton"
                  defaultMessage="Create index template"
                />
              </EuiButton>
            )
          }
        />
      </EuiFlexGroup>
    );
  }

  // Selectable - use EUI's built-in full height support
  return (
    <div
      data-test-subj="selectTemplateStep"
      css={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        marginLeft: '-24px',
        marginRight: '-24px',
        marginBottom: '-24px',
      }}
    >
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />
      <EuiSelectable
        aria-label={i18n.translate('xpack.createClassicStreamFlyout.selectTemplate.ariaLabel', {
          defaultMessage: 'Select an index template',
        })}
        searchable
        searchProps={{
          placeholder: i18n.translate(
            'xpack.createClassicStreamFlyout.selectTemplate.searchPlaceholder',
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
        listProps={{
          bordered: true,
          paddingSize: 's',
          onFocusBadge: false,
        }}
        height="full"
      >
        {(list, search) => (
          <>
            <div css={{ paddingLeft: '24px', paddingRight: '24px' }}>
              {search}
              <EuiSpacer size="s" />
            </div>
            {list}
          </>
        )}
      </EuiSelectable>
    </div>
  );
};
