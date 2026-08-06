/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { CONVERSATION_TEMPLATES } from '../../../../../common/templates';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useApplyTemplate } from '../../../hooks/use_apply_template';
import { useConversation } from '../../../hooks/use_conversation';
import { useConversationStream } from '../../../hooks/use_conversation_stream';

const labels = {
  setType: i18n.translate('xpack.agentBuilder.setTypeControl.setType', {
    defaultMessage: 'Set type',
  }),
  popoverAriaLabel: i18n.translate('xpack.agentBuilder.setTypeControl.popoverAriaLabel', {
    defaultMessage: 'Select a chat type',
  }),
  popoverTitle: i18n.translate('xpack.agentBuilder.setTypeControl.popoverTitle', {
    defaultMessage: 'Set chat type',
  }),
  popoverSubtitle: i18n.translate('xpack.agentBuilder.setTypeControl.popoverSubtitle', {
    defaultMessage: 'Unlocks structured fields, workflows, and panel views for this chat.',
  }),
  closePopover: i18n.translate('xpack.agentBuilder.setTypeControl.closePopover', {
    defaultMessage: 'Close',
  }),
  searchPlaceholder: i18n.translate('xpack.agentBuilder.setTypeControl.searchPlaceholder', {
    defaultMessage: 'Search types…',
  }),
};

type TemplateOption = EuiSelectableOption<{ template: ConversationTemplate }>;

const popoverPanelStyles = css`
  width: 440px;
`;

const renderTemplateOption = (option: TemplateOption) => {
  const { template } = option;
  if (!template) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{template.name}</strong>
        </EuiText>
      </EuiFlexItem>
      {template.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {template.description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const SetTypeControl: React.FC = () => {
  const conversationId = useConversationId();
  const { conversation, isLoading } = useConversation();
  const { isStreaming } = useConversationStream();
  const applyTemplate = useApplyTemplate(conversationId);
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  // While the conversation is loading we don't yet know whether a template is
  // already applied — render nothing rather than flash enabled before flipping to disabled.
  if (!conversationId || !CONVERSATION_TEMPLATES.length || isLoading) {
    return null;
  }

  const hasTemplate = Boolean(conversation?.template_id);

  const handleChange = async (
    _options: TemplateOption[],
    _event: unknown,
    changedOption: TemplateOption
  ) => {
    const { checked, template } = changedOption;
    if (checked !== 'on' || !template) return;

    setIsPopoverOpen(false);
    setIsApplying(true);
    try {
      await applyTemplate(template.id);
    } finally {
      setIsApplying(false);
    }
  };

  const options = CONVERSATION_TEMPLATES.map(
    (template): TemplateOption => ({
      key: template.id,
      label: template.name,
      textWrap: 'wrap',
      template,
      'data-test-subj': `agentBuilderSetTypeOption-${template.id}`,
    })
  );

  const button = (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType="arrowRight"
      iconSide="right"
      isLoading={isApplying}
      disabled={isStreaming || isApplying || hasTemplate}
      onClick={() => setIsPopoverOpen((open) => !open)}
      aria-expanded={isPopoverOpen}
      data-test-subj="agentBuilderSetTypeButton"
    >
      {labels.setType}
    </EuiButton>
  );

  const headerPaddingStyles = css`
    padding: ${euiTheme.size.base};
  `;

  const searchPaddingStyles = css`
    padding: ${euiTheme.size.base} ${euiTheme.size.base} 0;
  `;

  // Match the list items' horizontal padding to the search box's — EUI's default
  // .euiSelectableListItem padding is narrower, which misaligns the row text with
  // the search input's placeholder text above it.
  const listWrapperStyles = css`
    max-height: 320px;
    overflow-y: auto;

    #agentBuilderSetTypeList .euiSelectableListItem {
      padding: ${euiTheme.size.s} ${euiTheme.size.base};
    }
  `;

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-labelledby={popoverTitleId}
    >
      <div css={popoverPanelStyles}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="flexStart"
          gutterSize="s"
          responsive={false}
          css={headerPaddingStyles}
        >
          <EuiFlexItem grow={true}>
            <EuiTitle size="xs">
              <h3 id={popoverTitleId}>{labels.popoverTitle}</h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {labels.popoverSubtitle}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.closePopover} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={() => setIsPopoverOpen(false)}
                aria-label={labels.closePopover}
                data-test-subj="agentBuilderSetTypeClosePopoverButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="none" />

        <EuiSelectable
          aria-label={labels.popoverAriaLabel}
          options={options}
          onChange={handleChange}
          singleSelection
          searchable
          searchProps={{
            placeholder: labels.searchPlaceholder,
            'data-test-subj': 'agentBuilderSetTypeSearch',
          }}
          renderOption={renderTemplateOption}
          listProps={{
            id: 'agentBuilderSetTypeList',
            isVirtualized: false,
            bordered: false,
          }}
        >
          {(list, search) => (
            <>
              <div css={searchPaddingStyles}>{search}</div>
              <div css={listWrapperStyles}>{list}</div>
            </>
          )}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
