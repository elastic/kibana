/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import { EuiCallOut, EuiText } from '@elastic/eui';
import React from 'react';
// @ts-expect-error untyped local
import { DatasourceComponent } from '../datasource_component';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import { Datasource } from '../../../expression_types/datasource';

const TestDatasource = ({ args }: any) => (
  <EuiCallOut title="My Test Data Source" iconType="info">
    <EuiText size="s">
      <p>Hello! I am a datasource with a query arg of: {args.query}</p>
    </EuiText>
  </EuiCallOut>
);

const testDatasource = () => ({
  name: 'test',
  displayName: 'Test Datasource',
  help: 'This is a test data source',
  image: 'training',
  template: templateFromReactComponent(TestDatasource),
});

const wrappedTestDatasource = new Datasource(testDatasource());

const args = {
  query: ['select * from kibana'],
};

export default {
  title: 'components/datasource/DatasourceComponent',

  parameters: {
    info: {
      inline: true,
      styles: {
        infoBody: {
          margin: 20,
        },
        infoStory: {
          margin: '40px 60px',
          width: '320px',
        },
      },
    },
  },
};

export const SimpleDatasource = {
  render: () => (
    <DatasourceComponent
      args={args}
      datasources={[wrappedTestDatasource]}
      datasource={wrappedTestDatasource}
      datasourceDef={{}}
      stateArgs={args}
      stateDatasource={wrappedTestDatasource}
      selectDatasouce={action('selectDatasouce')}
      setDatasourceAst={action('setDatasourceAst')}
      updateArgs={action('updateArgs')}
      resetArgs={action('resetArgs')}
      selecting={false}
      setSelecting={action('setSelecting')}
      previewing={false}
      setPreviewing={action('setPreviewing')}
      isInvalid={false}
      setInvalid={action('setInvalid')}
      renderError={action('renderError')}
    />
  ),

  name: 'simple datasource',
};

export const DatasourceWithExpressionArguments = {
  render: () => (
    <DatasourceComponent
      args={{ query: [{ name: 'expression' }] }}
      datasources={[wrappedTestDatasource]}
      datasource={wrappedTestDatasource}
      datasourceDef={{}}
      stateArgs={{ query: [{ name: 'expression' }] }}
      stateDatasource={wrappedTestDatasource}
      selectDatasouce={action('selectDatasouce')}
      setDatasourceAst={action('setDatasourceAst')}
      updateArgs={action('updateArgs')}
      resetArgs={action('resetArgs')}
      selecting={false}
      setSelecting={action('setSelecting')}
      previewing={false}
      setPreviewing={action('setPreviewing')}
      isInvalid={false}
      setInvalid={action('setInvalid')}
      renderError={action('renderError')}
    />
  ),

  name: 'datasource with expression arguments',
};
