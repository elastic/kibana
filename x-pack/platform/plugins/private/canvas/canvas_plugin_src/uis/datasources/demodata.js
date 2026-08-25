/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings } from '../../../i18n';

const { DemoData: strings } = DataSourceStrings;

const DemodataDatasource = () => (
  <KbnInfoCallout title={strings.getHeading()} text={strings.getDescription()} />
);

export const demodata = () => ({
  name: 'demodata',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  image: 'training',
  template: templateFromReactComponent(DemodataDatasource),
});
