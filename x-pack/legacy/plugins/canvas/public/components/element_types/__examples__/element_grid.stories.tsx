/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { ElementGrid } from '../element_grid';
import { testElements, testCustomElements } from './fixtures/test_elements';

storiesOf('components/Elements/ElementGrid', module)
  .addDecorator(story => (
    <div
      style={{
        width: '1000px',
      }}
    >
      {story()}
    </div>
  ))
  .add('without controls', () => (
    <ElementGrid elements={testElements} handleClick={action('addElement')} />
  ))
  .add('with controls', () => (
    <ElementGrid
      elements={testCustomElements}
      handleClick={action('addCustomElement')}
      showControls
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ))
  .add('with text filter', () => (
    <ElementGrid
      elements={testElements}
      handleClick={action('addCustomElement')}
      filterText="table"
    />
  ))
  .add('with tags filter', () => (
    <ElementGrid
      elements={testElements}
      handleClick={action('addCustomElement')}
      filterTags={['graphic']}
    />
  ))
  .add('with controls and filter', () => (
    <ElementGrid
      elements={testCustomElements}
      handleClick={action('addCustomElement')}
      filterText="Lorem"
      showControls
      onDelete={action('onDelete')}
      onEdit={action('onEdit')}
    />
  ));
