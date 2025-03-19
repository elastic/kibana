/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AssistantIcon } from './icon';

/**
 * Avatar component for the AI Assistant.
 */
export type AssistantAvatarProps = Omit<
  EuiAvatarProps,
  'iconType' | 'initials' | 'initialsLength' | 'imageUrl'
>;

const aiAssistantName = i18n.translate('xpack.aiAssistant.avatar.aiAssistantLabel', {
  defaultMessage: 'AI Assistant',
});

/**
 * A `EuiAvatar` component customized for the AI Assistant.
 */
export const AssistantAvatar = ({
  color = 'plain',
  size = 'm',
  ...props
}: AssistantAvatarProps) => {
  return (
    <EuiAvatar {...{ ...props, color, size }} name={aiAssistantName} iconType={AssistantIcon} />
  );
};
