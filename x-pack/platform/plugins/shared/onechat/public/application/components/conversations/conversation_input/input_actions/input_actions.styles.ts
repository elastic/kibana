/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useConversationBorderRadius } from '../../conversation.styles';

export const usePopoverButtonStyles = ({ open }: { open: boolean }) => {
  const { euiTheme } = useEuiTheme();
  const popoverButtonStyles = css`
    border-style: none;
    ${useConversationBorderRadius('m')}
  `;
  const openPopoverStyles = css`
    border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.borderStrongText};
  `;
  return [popoverButtonStyles, open && openPopoverStyles];
};
