/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withProps } from 'recompose';
import { NumberFormatArgInput as Component, Props as ComponentProps } from './number_format';
import { AdvancedSettings } from '../../../../public/lib/kibana_advanced_settings';
// @ts-ignore untyped local lib
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentFactory } from '../../../../types/arguments';

const formatMap = {
  NUMBER: AdvancedSettings.get('format:number:defaultPattern'),
  PERCENT: AdvancedSettings.get('format:percent:defaultPattern'),
  CURRENCY: AdvancedSettings.get('format:currency:defaultPattern'),
  DURATION: '00:00:00',
  BYTES: AdvancedSettings.get('format:bytes:defaultPattern'),
};

const numberFormats = [
  { value: formatMap.NUMBER, text: 'Number' },
  { value: formatMap.PERCENT, text: 'Percent' },
  { value: formatMap.CURRENCY, text: 'Currency' },
  { value: formatMap.DURATION, text: 'Duration' },
  { value: formatMap.BYTES, text: 'Bytes' },
];

export const NumberFormatArgInput = compose<ComponentProps, null>(withProps({ numberFormats }))(
  Component
);

export const numberFormat: ArgumentFactory<ComponentProps> = () => ({
  name: 'numberFormat',
  displayName: 'Number Format',
  help: 'Select or enter a valid NumeralJS format',
  simpleTemplate: templateFromReactComponent(NumberFormatArgInput),
});
