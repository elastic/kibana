/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';

export const searchConnectorsPageTemplate = css({
  position: 'relative',

  '.searchConnectorsPageTemplate__content': {
    // Note: relative positioning is required for our centered Loading component
    position: 'relative',
  },

  '.euiSideNavItem--emphasized': {
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
});
