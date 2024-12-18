/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const resultComboBoxCss = {
  '&.euiComboBox': {
    position: 'relative',
    left: '-1px',

    '.euiComboBox__inputWrap': {
      borderRadius: '0 6px 6px 0',
    },
  },
};

export const euiSuperSelectCss = {
  minWidth: '70px',
  borderRadius: '6px 0 0 6px',

  '.euiIcon': {
    padding: 0,
    width: '18px',
    background: 'none',
  },
};

export const fieldIconCss = {
  width: '32px',

  '> svg': {
    padding: '0 6px !important',
  },
};

export const fieldSpanCss = {
  paddingTop: '0 !important',
  paddingBottom: '0 !important',
  paddingLeft: '5px',
};

export const descriptionWrapperCss = {
  overflow: 'hidden',
};

export const semicolonWrapperCss = {
  marginTop: '28px',
};

// align the icon to the inputs
export const buttonWrapperCss = {
  marginTop: '28px',
  width: '24px',
};

export const ECSFieldWrapperCss = {
  maxWidth: '100%',
};
