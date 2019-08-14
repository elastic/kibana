/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import * as React from 'react';
import { npSetup, npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

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
  const [embeddable, setEmbeddable] = React.useState(null);
  const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);
  console.log('factory: ', factory);

  factory
    .createFromSavedObject('de49f830-bed2-11e9-974d-a37bcbb04644', {
      filters: [],
      hidePanelTitles: false,
      id: '822cd0f0-ce7c-419d-aeaa-1171cf452745',
      query: { query: '', language: 'kuery' },
      refreshConfig: { value: 0, pause: true },
      timeRange: { from: '2017-10-01T20:20:36.275Z', to: '2019-02-04T21:20:55.548Z' },
      viewMode: 'edit',
    })
    .then(data => {
      setEmbeddable(data);
    })
    .catch(error => console.log('ERROR EMBEDABLe', error));
  return (
    <>
      <EuiTitle>
        <h6>{"I'm a map!"}</h6>
      </EuiTitle>
      <EuiSpacer />
      {embeddable != null && (
        <EmbeddablePanel
          embeddable={embeddable}
          getActions={start.getTriggerCompatibleActions}
          getEmbeddableFactory={start.getEmbeddableFactory}
          getAllEmbeddableFactories={start.getEmbeddableFactories}
          notifications={npStart.core.notifications}
          overlays={npStart.core.overlays}
          inspector={npStart.plugins.inspector}
          SavedObjectFinder={SavedObjectFinder}
        />
      )}
      <EuiSpacer />
    </>
  );
});
