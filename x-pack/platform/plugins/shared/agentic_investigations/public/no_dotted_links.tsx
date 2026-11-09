/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css, Global } from '@emotion/react';

/**
 * Links are not underlined with dots here. EUI draws every `EuiLink` that way at rest, which
 * reads as noise in lists of events, entities and runs. Hover and focus keep their solid
 * underline, so a link still shows itself when you reach for it.
 */
export const NoDottedLinks: React.FC = () => (
  <Global
    styles={css`
      a.euiLink:not(:hover):not(:focus),
      button.euiLink:not(:hover):not(:focus) {
        text-decoration: none;
      }
    `}
  />
);
