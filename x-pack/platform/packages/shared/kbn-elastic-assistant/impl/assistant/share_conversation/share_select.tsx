/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSuperSelect,
  type EuiSuperSelectOption,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import type { User } from '@kbn/elastic-assistant-common';
import { ConversationSharedState, getConversationSharedState } from '@kbn/elastic-assistant-common';
import { ShareUserSelect } from './share_user_select';
import { getSharedIcon } from './utils';
import type { Conversation } from '../../..';
import * as i18n from './translations';

interface Props {
  onUsersUpdate: (users: User[]) => void;
  onSharedSelectionChange: (value: ConversationSharedState) => void;
  selectedConversation: Conversation | undefined;
}

const ShareSelectComponent: React.FC<Props> = ({
  selectedConversation,
  onSharedSelectionChange,
  onUsersUpdate,
}) => {
  const conversationSharedState = useMemo(
    () => getConversationSharedState(selectedConversation),
    [selectedConversation]
  );
  const [value, setValue] = useState<ConversationSharedState>(conversationSharedState);

  const onChange = useCallback(
    (v: ConversationSharedState) => {
      if (value !== v) {
        setValue(v);
        onSharedSelectionChange(v);
      }
    },
    [value, onSharedSelectionChange]
  );

  const renderSelectedOption = useCallback(
    (title: string, icon: string) => (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>

        <EuiFlexItem>{title}</EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const renderOption = useCallback(
    (title: string, description: string) => (
      <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              font-weight: bold;
            `}
            data-test-subj="optionLabel"
            size="s"
          >
            {title}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText
            css={css`
              text-wrap: pretty;
            `}
            data-test-subj="optionDescription"
            size="s"
          >
            {description}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );
  const items = useMemo<Array<EuiSuperSelectOption<ConversationSharedState>>>(
    () => [
      {
        value: ConversationSharedState.PRIVATE,
        inputDisplay: renderSelectedOption(
          i18n.PRIVATE,
          getSharedIcon(ConversationSharedState.PRIVATE)
        ),
        dropdownDisplay: renderOption(i18n.PRIVATE, i18n.VISIBLE_PRIVATE),
        'data-test-subj': ConversationSharedState.PRIVATE,
      },
      {
        value: ConversationSharedState.SHARED,
        'data-test-subj': ConversationSharedState.SHARED,
        inputDisplay: renderSelectedOption(
          i18n.SHARED,
          getSharedIcon(ConversationSharedState.SHARED)
        ),
        dropdownDisplay: renderOption(i18n.SHARED, i18n.VISIBLE_SHARED),
      },
      {
        value: ConversationSharedState.RESTRICTED,
        'data-test-subj': ConversationSharedState.RESTRICTED,
        inputDisplay: renderSelectedOption(
          i18n.RESTRICTED,
          getSharedIcon(ConversationSharedState.RESTRICTED)
        ),
        dropdownDisplay: renderOption(i18n.RESTRICTED, i18n.VISIBLE_RESTRICTED),
      },
    ],
    [renderOption, renderSelectedOption]
  );

  return (
    <>
      <EuiSuperSelect
        aria-label={i18n.VISIBILITY}
        data-test-subj="shareSelect"
        fullWidth
        options={items}
        onChange={onChange}
        valueOfSelected={value}
      />
      {value === ConversationSharedState.RESTRICTED && (
        <>
          <EuiSpacer />
          <ShareUserSelect
            onUsersUpdate={onUsersUpdate}
            selectedConversation={selectedConversation}
          />
        </>
      )}
    </>
  );
};

export const ShareSelect = React.memo(ShareSelectComponent);
