/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import * as React from 'react';
import { npSetup, npStart } from 'ui/new_platform';
import {
  setup,
  start,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { EmbeddablePanel } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { HelloWorldEmbeddable } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/test_samples/embeddables/hello_world';

import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';

console.log('npSetup', npSetup);
console.log('npStart', npStart);

console.log('setup', setup);
console.log('start', start);

console.log('factories', start.getEmbeddableFactories());

export const SavedMap = React.memo(() => {
  const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);
  console.log('factory: ', factory);

  let embeddable;
  if (!factory) {
    console.log('Error! No map factory found');
    embeddable = new HelloWorldEmbeddable({ id: 'maps' });
  } else {
    console.log('Factory found! Loading map from saved object.');
    embeddable = factory.createFromSavedObject('53006120-b56c-11e9-bfa8-fd22ee6bf542', {
      id: 'some-id',
      title: 'Pew! Pewpew!',
    });
  }
  return (
    <>
      <EuiTitle>
        <h6>{"I'm a map!"}</h6>
      </EuiTitle>
      <EuiSpacer />
      <EmbeddablePanel embeddable={embeddable} />
      <EuiSpacer />
    </>
  );
});
