/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableConversationProps } from '../embeddable/types';

export interface ConversationFlyoutProps extends EmbeddableConversationProps {
  onClose: () => void;
  ConversationComponent: React.FC<EmbeddableConversationProps>;
}

export interface OpenConversationFlyoutOptions extends EmbeddableConversationProps {
  onClose?: () => void;
}
