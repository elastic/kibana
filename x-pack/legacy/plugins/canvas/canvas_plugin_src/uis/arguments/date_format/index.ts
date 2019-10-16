/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withProps } from 'recompose';
import moment from 'moment';
import { DateFormatArgInput as Component, Props as ComponentProps } from './date_format';
import { AdvancedSettings } from '../../../../public/lib/kibana_advanced_settings';
// @ts-ignore untyped local lib
import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ArgumentFactory } from '../../../../types/arguments';
import { ArgumentStrings } from '../../../../i18n';

const { DateFormat: strings } = ArgumentStrings;

const formatMap = {
  DEFAULT: AdvancedSettings.get('dateFormat'),
  NANOS: AdvancedSettings.get('dateNanosFormat'),
  ISO8601: '',
  LOCAL_LONG: 'LLLL',
  LOCAL_SHORT: 'LLL',
  LOCAL_DATE: 'l',
  LOCAL_TIME_WITH_SECONDS: 'LTS',
};

const now = moment();

const dateFormats = Object.values(formatMap).map(format => ({
  value: format,
  text: moment.utc(now).format(format),
}));

export const DateFormatArgInput = compose<ComponentProps, null>(withProps({ dateFormats }))(
  Component
);

export const dateFormat: ArgumentFactory<ComponentProps> = () => ({
  name: 'dateFormat',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(DateFormatArgInput),
});
