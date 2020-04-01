/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings } from '../../../i18n';

const { DemoData: strings } = DataSourceStrings;

const DemodataDatasource = () => (
  <EuiText size="s">
    <p>{strings.getDescription()}</p>
  </EuiText>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  image: 'training',
  template: templateFromReactComponent(DemodataDatasource),
});
