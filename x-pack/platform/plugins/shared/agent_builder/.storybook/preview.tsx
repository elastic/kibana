/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Decorator } from '@storybook/react';
import { appendIconComponentCache } from '@elastic/eui/es/components/icon/icon';
import { icon as boxesVertical } from '@elastic/eui/es/components/icon/assets/boxes_vertical';
import { icon as copy } from '@elastic/eui/es/components/icon/assets/copy';
import { icon as cross } from '@elastic/eui/es/components/icon/assets/cross';
import { icon as documentIcon } from '@elastic/eui/es/components/icon/assets/document';
import { icon as expand } from '@elastic/eui/es/components/icon/assets/expand';
import { icon as readOnly } from '@elastic/eui/es/components/icon/assets/read_only';
import { icon as save } from '@elastic/eui/es/components/icon/assets/save';
import { icon as trash } from '@elastic/eui/es/components/icon/assets/trash';
import { icon as visualizeApp } from '@elastic/eui/es/components/icon/assets/app_visualize';
import { icon as warning } from '@elastic/eui/es/components/icon/assets/warning';

// Preload the EUI icons used across the attachment-card shell stories.
// Storybook can't reliably wait for EUI's async icon chunks before a story
// screenshot, so we register them synchronously up front.
appendIconComponentCache({
  boxesVertical,
  copy,
  cross,
  document: documentIcon,
  expand,
  readOnly,
  save,
  trash,
  visualizeApp,
  warning,
});

const I18nDecorator: Decorator = (storyFn) => <I18nProvider>{storyFn()}</I18nProvider>;

export const decorators = [I18nDecorator];
