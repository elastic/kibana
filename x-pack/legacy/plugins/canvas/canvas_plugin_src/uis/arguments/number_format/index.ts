/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withProps } from 'recompose';
import { NumberFormatArgInput as Component, Props as ComponentProps } from './number_format';
// @ts-ignore untyped local lib
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentFactory } from '../../../../types/arguments';
import { ArgumentStrings } from '../../../../i18n';

const { NumberFormat: strings } = ArgumentStrings;

const formatMap = {
  NUMBER: '0,0.[000]',
  PERCENT: '0,0.[000]%',
  CURRENCY: '$0,0.[00]',
  DURATION: '00:00:00',
  BYTES: '0,0.[000]b',
};

const numberFormats = [
  { value: formatMap.NUMBER, text: strings.getFormatNumber() },
  { value: formatMap.PERCENT, text: strings.getFormatPercent() },
  { value: formatMap.CURRENCY, text: strings.getFormatCurrency() },
  { value: formatMap.DURATION, text: strings.getFormatDuration() },
  { value: formatMap.BYTES, text: strings.getFormatBytes() },
];

export const NumberFormatArgInput = compose<ComponentProps, null>(withProps({ numberFormats }))(
  Component
);

export const numberFormat: ArgumentFactory<ComponentProps> = () => ({
  name: 'numberFormat',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(NumberFormatArgInput),
});
