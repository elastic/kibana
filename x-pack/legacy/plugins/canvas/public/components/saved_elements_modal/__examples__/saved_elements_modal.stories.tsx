/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { SavedElementsModal } from '../saved_elements_modal';
import { testCustomElements } from './fixtures/test_elements';

const findNoCustomElements = () => Promise.resolve([]);
const findCustomElements = () => Promise.resolve(testCustomElements);

storiesOf('components/SavedElementsModal', module)
  .add('no custom elements', () => (
    <SavedElementsModal
      onClose={action('onClose')}
      addCustomElement={action('addCustomElement')}
      findCustomElements={findNoCustomElements}
      updateCustomElement={action('updateCustomElement')}
      removeCustomElement={action('removeCustomElement')}
    />
  ))
  .add('with custom elements', () => (
    <SavedElementsModal
      onClose={action('onClose')}
      addCustomElement={action('addCustomElement')}
      findCustomElements={findCustomElements}
      updateCustomElement={action('updateCustomElement')}
      removeCustomElement={action('removeCustomElement')}
    />
  ));
