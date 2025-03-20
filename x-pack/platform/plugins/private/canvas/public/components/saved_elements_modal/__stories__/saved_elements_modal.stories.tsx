/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import type { StoryObj } from '@storybook/react';
import { waitFor } from '@kbn/presentation-util-plugin/public/__stories__';
import { SavedElementsModal } from '../saved_elements_modal.component';
import { getTestCustomElements } from './fixtures/test_elements';
import { CustomElement } from '../../../../types';

export default {
  title: 'components/SavedElementsModal',
};

export const NoCustomElements: StoryObj = {
  render: () => (
    <SavedElementsModal
      customElements={[] as CustomElement[]}
      onAddCustomElement={action('onAddCustomElement')}
      onSearch={action('onSearch')}
      onUpdateCustomElement={action('onUpdateCustomElement')}
      onRemoveCustomElement={action('onRemoveCustomElement')}
      onClose={action('onClose')}
    />
  ),

  name: 'no custom elements',
};

export const WithCustomElements: StoryObj = {
  render: (_, props) => (
    <SavedElementsModal
      customElements={props?.testCustomElements}
      onAddCustomElement={action('onAddCustomElement')}
      onSearch={action('onSearch')}
      onUpdateCustomElement={action('onUpdateCustomElement')}
      onRemoveCustomElement={action('onRemoveCustomElement')}
      onClose={action('onClose')}
    />
  ),

  name: 'with custom elements',
  decorators: [waitFor(getTestCustomElements())],
};

export const WithTextFilter: StoryObj = {
  render: (_, props) => (
    <SavedElementsModal
      customElements={props?.testCustomElements}
      initialSearch="Element 2"
      onAddCustomElement={action('onAddCustomElement')}
      onSearch={action('onSearch')}
      onUpdateCustomElement={action('onUpdateCustomElement')}
      onRemoveCustomElement={action('onRemoveCustomElement')}
      onClose={action('onClose')}
    />
  ),

  name: 'with text filter',
  decorators: [waitFor(getTestCustomElements())],
};
