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
import { SetupInitializer } from '../../../plugin';

const { NumberFormat: strings } = ArgumentStrings;

export const numberFormatInitializer: SetupInitializer<ArgumentFactory<ComponentProps>> = (
  core,
  plugins
) => {
  const formatMap = {
    NUMBER: core.uiSettings.get('format:number:defaultPattern'),
    PERCENT: core.uiSettings.get('format:percent:defaultPattern'),
    CURRENCY: core.uiSettings.get('format:currency:defaultPattern'),
    DURATION: '00:00:00',
    BYTES: core.uiSettings.get('format:bytes:defaultPattern'),
  };

  const numberFormats = [
    { value: formatMap.NUMBER, text: strings.getFormatNumber() },
    { value: formatMap.PERCENT, text: strings.getFormatPercent() },
    { value: formatMap.CURRENCY, text: strings.getFormatCurrency() },
    { value: formatMap.DURATION, text: strings.getFormatDuration() },
    { value: formatMap.BYTES, text: strings.getFormatBytes() },
  ];

  const NumberFormatArgInput = compose<ComponentProps, null>(withProps({ numberFormats }))(
    Component
  );

  return () => ({
    name: 'numberFormat',
    displayName: strings.getDisplayName(),
    help: strings.getHelp(),
    simpleTemplate: templateFromReactComponent(NumberFormatArgInput),
  });
};
