/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const resultComboBoxCss = css({
  '&.euiComboBox': {
    position: 'relative',
    left: '-1px',

    '.euiComboBox__inputWrap': {
      borderRadius: '0 6px 6px 0',
    },
  },
});

export const euiSuperSelectCss = css({
  minWidth: '70px',
  borderRadius: '6px 0 0 6px',

  '.euiIcon': {
    padding: 0,
    width: '18px',
    background: 'none',
  },
});

export const fieldIconCss = css({
  width: '32px',

  '> svg': {
    padding: '0 6px !important',
  },
});

export const fieldSpanCss = css({
  paddingTop: '0 !important',
  paddingBottom: '0 !important',
  paddingLeft: '5px',
});

export const descriptionWrapperCss = css({
  overflow: 'hidden',
});

export const semicolonWrapperCss = css({
  marginTop: '28px',
});

// align the icon to the inputs
export const buttonWrapperCss = css({
  marginTop: '28px',
  width: '24px',
});

export const ECSFieldWrapperCss = css({
  maxWidth: '100%',
});
