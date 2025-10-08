/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiIcon } from '@elastic/eui';
import type { ConversationSharedState } from '@kbn/elastic-assistant-common';
import type { EuiBadgeProps } from '@elastic/eui/src/components/badge/badge';
import { getSharedIcon } from './utils';
import * as i18n from './translations';

interface ShareBadgeProps {
  conversationSharedState: ConversationSharedState;
  isConversationOwner: boolean;
  isDropdown?: boolean;
  label: string;
  onClick?: () => void;
}

export const ShareBadge: React.FC<ShareBadgeProps> = ({
  conversationSharedState,
  isConversationOwner,
  isDropdown = false,
  label,
  onClick,
}) => {
  const icon = useMemo(() => getSharedIcon(conversationSharedState), [conversationSharedState]);
  const onClickProps = useMemo(
    () => (onClick ? { onClick, onClickAriaLabel: i18n.SELECT_VISIBILITY_ARIA_LABEL } : {}),
    [onClick]
  );
  const dropdownProps = useMemo(
    () =>
      isDropdown ? { iconType: 'arrowDown', iconSide: 'right' as EuiBadgeProps['iconSide'] } : {},
    [isDropdown]
  );
  return (
    <EuiBadge
      aria-label={i18n.VISIBILITY}
      color="hollow"
      data-test-subj="shareBadgeButton"
      isDisabled={!isConversationOwner}
      {...dropdownProps}
      {...onClickProps}
    >
      <EuiIcon
        type={icon}
        size="s"
        css={css`
          margin-right: 4px;
        `}
      />
      {label}
    </EuiBadge>
  );
};
