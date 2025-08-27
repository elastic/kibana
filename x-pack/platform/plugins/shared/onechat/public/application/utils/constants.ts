/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/onechat-common';
import { ToolType as ToolTypeEnum } from '@kbn/onechat-common';
import { labels } from './i18n';

export const toolTypeDisplays: Record<ToolType, { label: string; icon: string }> = {
  [ToolTypeEnum.esql]: {
    label: labels.tools.esqlLabel,
    icon: 'code',
  },
  [ToolTypeEnum.builtin]: {
    label: labels.tools.builtinLabel,
    icon: 'logoElastic',
  },
};
