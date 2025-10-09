/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useEmbeddableMode } from '../../context/embeddable_mode_context';

export const useConversationGridCenterColumnWidth = () => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedMode } = useEmbeddableMode();

  // In embeddable mode (like flyouts), use a more flexible width
  // In standalone mode, use a fixed max width for better readability
  const contentMaxWidth = isEmbeddedMode ? '100%' : `calc(${euiTheme.size.xl} * 25)`;

  return contentMaxWidth;
};
