/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { Decorator } from '@storybook/react';

const FIELD_STORY_MAX_WIDTH_PX = 600;

export const fieldStoryDecorator: Decorator = (Story) => (
  <div css={css({ maxWidth: FIELD_STORY_MAX_WIDTH_PX })}>
    <Story />
  </div>
);
