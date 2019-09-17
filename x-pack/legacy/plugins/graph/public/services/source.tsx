/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import React from 'react';
import { GraphSourceModal } from '../components/graph_source_modal';
import { IndexPatternSavedObject } from '../types';

export function openIndexPatternModal(
  {
    overlays,
    savedObjects,
    uiSettings,
  }: {
    overlays: CoreStart['overlays'];
    savedObjects: CoreStart['savedObjects'];
    uiSettings: CoreStart['uiSettings'];
  },
  onSelected: (indexPattern: IndexPatternSavedObject) => void
) {
  const modalRef = overlays.openModal(
    <GraphSourceModal
      uiSettings={uiSettings}
      savedObjects={savedObjects}
      onIndexPatternSelected={indexPattern => {
        onSelected(indexPattern);
        modalRef.close();
      }}
    />
  );
}
