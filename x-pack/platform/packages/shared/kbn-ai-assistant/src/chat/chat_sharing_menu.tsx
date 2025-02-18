/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiBadge,
  EuiSelectable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface OptionData {
  description?: string;
}

const privateLabel = i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.private', {
  defaultMessage: 'Private',
});

const sharedLabel = i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.shared', {
  defaultMessage: 'Shared',
});

export function ChatSharingMenu() {
  const [selectedValue, setSelectedValue] = useState('private');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const options: Array<EuiSelectableOption<OptionData>> = [
    {
      key: 'private',
      label: privateLabel,
      checked: !selectedValue || selectedValue === 'private' ? 'on' : undefined,
      description: i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.privateDescription', {
        defaultMessage: 'This conversation is only visible to you.',
      }),
    },
    {
      key: 'shared',
      label: sharedLabel,
      checked: selectedValue === 'shared' ? 'on' : undefined,
      description: i18n.translate('xpack.aiAssistant.chatHeader.shareOptions.sharedDescription', {
        defaultMessage: 'Team members can view this conversation.',
      }),
    },
  ];

  const renderOption = useCallback(
    (option: EuiSelectableOption<OptionData>) => (
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>{option.label}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{option.description}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return (
    <EuiPopover
      button={
        <EuiBadge
          iconType={selectedValue === 'shared' ? 'users' : 'lock'}
          color="hollow"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          onClickAriaLabel="Toggle sharing options"
        >
          {selectedValue === 'shared' ? sharedLabel : privateLabel}
        </EuiBadge>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label="Sharing options"
        options={options}
        singleSelection="always"
        renderOption={renderOption}
        onChange={(newOptions) => {
          const selectedOption = newOptions.find((option) => option.checked === 'on');
          if (selectedOption) setSelectedValue(selectedOption.key as string);
          setIsPopoverOpen(false);
        }}
        listProps={{
          isVirtualized: false,
          onFocusBadge: false,
          textWrap: 'wrap',
        }}
      >
        {(list) => <div style={{ width: 250 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}
