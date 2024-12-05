/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Assign } from '@kbn/utility-types';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { NumberFormatArgInput, Props as ComponentProps } from './number_format';
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentFactory } from '../../../../types/arguments';
import { ArgumentStrings } from '../../../../i18n';
import { SetupInitializer } from '../../../plugin';

const { NumberFormat: strings } = ArgumentStrings;

const getNumberFormatArgInput =
  (defaultNumberFormats: ComponentProps['numberFormats']) =>
  (props: Assign<ComponentProps, { numberFormats?: ComponentProps['numberFormats'] }>) =>
    <NumberFormatArgInput numberFormats={defaultNumberFormats} {...props} />;

export const numberFormatInitializer: SetupInitializer<ArgumentFactory<ComponentProps>> = (
  core,
  plugins
) => {
  const formatMap = {
    NUMBER: core.uiSettings.get(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN),
    PERCENT: core.uiSettings.get(FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN),
    CURRENCY: core.uiSettings.get(FORMATS_UI_SETTINGS.FORMAT_CURRENCY_DEFAULT_PATTERN),
    DURATION: '00:00:00',
    BYTES: core.uiSettings.get(FORMATS_UI_SETTINGS.FORMAT_BYTES_DEFAULT_PATTERN),
  };

  const numberFormats = [
    { value: formatMap.NUMBER, text: strings.getFormatNumber() },
    { value: formatMap.PERCENT, text: strings.getFormatPercent() },
    { value: formatMap.CURRENCY, text: strings.getFormatCurrency() },
    { value: formatMap.DURATION, text: strings.getFormatDuration() },
    { value: formatMap.BYTES, text: strings.getFormatBytes() },
  ];

  return () => ({
    name: 'numberFormat',
    displayName: strings.getDisplayName(),
    help: strings.getHelp(),
    simpleTemplate: templateFromReactComponent(getNumberFormatArgInput(numberFormats)),
  });
};
