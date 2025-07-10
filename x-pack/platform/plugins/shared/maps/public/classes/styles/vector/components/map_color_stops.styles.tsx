/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui';
import type { EmotionStyles } from '@kbn/css-utils/public/use_memo_css';

export const mapColorStopsStyles: EmotionStyles = {
  mapColorStops: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      '& + &': {
        marginTop: euiTheme.size.s,
      },
    }),
};
