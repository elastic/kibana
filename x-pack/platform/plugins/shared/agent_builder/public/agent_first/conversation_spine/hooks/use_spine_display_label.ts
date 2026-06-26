/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SpineType } from '../types';

const spineTypeLabels: Record<SpineType, string> = {
  chat: i18n.translate('xpack.agentBuilder.conversationSpine.type.chat', {
    defaultMessage: 'Chat',
  }),
};

export const getSpineTypeLabel = (type: SpineType): string => spineTypeLabels[type];

export const formatSpineDisplayLabel = (type: SpineType, identifier: string): string =>
  `${getSpineTypeLabel(type)} · ${identifier}`;
