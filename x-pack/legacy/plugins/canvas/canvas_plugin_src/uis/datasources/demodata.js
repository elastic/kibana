/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ComponentStrings, CANVAS, DataSourceStrings } from '../../../i18n';

const { DemoData: strings } = DataSourceStrings;

const DemodataDatasource = () => (
  <EuiText size="s">
    <p>
      <FormattedMessage
        id="xpack.canvas.uis.dataSources.demoDataDescription"
        defaultMessage="By default, every {canvas} element is connected to the demo data source. Change the data source, above, to connect your own data."
        values={{
          canvas: CANVAS,
          clickText: (
            <strong>{ComponentStrings.DatasourceDatasourceComponent.getChangeButtonLabel()}</strong>
          ),
        }}
      />
    </p>
  </EuiText>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  // Replace this with a better icon when we have time.
  image: 'logoElasticStack',
  template: templateFromReactComponent(DemodataDatasource),
});
