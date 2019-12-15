/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'src/core/public';
import React from 'react';
import { KibanaReactOverlays } from 'src/plugins/kibana_react/public';
import { SourceModal } from '../components/source_modal';
import { IndexPatternSavedObject } from '../types';

export function openSourceModal(
  {
    overlays,
    savedObjects,
    uiSettings,
  }: {
    overlays: KibanaReactOverlays;
    savedObjects: CoreStart['savedObjects'];
    uiSettings: CoreStart['uiSettings'];
  },
  onSelected: (indexPattern: IndexPatternSavedObject) => void
) {
  const modalRef = overlays.openModal(
    <SourceModal
      uiSettings={uiSettings}
      savedObjects={savedObjects}
      onIndexPatternSelected={indexPattern => {
        onSelected(indexPattern);
        modalRef.close();
      }}
    />
  );
}
