/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const DemodataDatasource = () => (
  <EuiText>
    <h3>You are using demo data</h3>
    <p>
      This data source is connected to every Canvas element by default. Its purpose is to give you
      some playground data to get started. The demo set contains 4 strings, 3 numbers and a date.
      Feel free to experiment and, when you're ready, click <strong>Change your data source</strong>{' '}
      above to connect to your own data.
    </p>
  </EuiText>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: 'Demo data',
  help: 'Mock data set with usernames, prices, projects, countries, and phases',
  // Replace this with a better icon when we have time.
  image: 'logoElasticStack',
  template: templateFromReactComponent(DemodataDatasource),
});
