/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings } from '../../strings';
import { ComponentStrings, CANVAS } from '../../../i18n';

const { DemoData: strings } = DataSourceStrings;

const DemodataDatasource = () => (
  <EuiText>
    <h3>{strings.getHeading()}</h3>
    <p>
      <FormattedMessage
        id="xpack.canvas.uis.dataSources.demoDataDescription"
        defaultMessage="This data source is connected to every {canvas} element by default. Its purpose is to give you some playground data to get started. The demo set contains 4 strings, 3 numbers and a date. Feel free to experiment and, when you're ready, click {clickText} above to connect to your own data."
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
