/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { CoreStart } from 'src/core/public';
import { SavedObjectFinder } from '../../../../../../src/plugins/kibana_react/public';
import { IndexPatternSavedObject } from '../types';

export interface SourcePickerProps {
  currentIndexPattern?: IndexPatternSavedObject;
  onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => void;
  savedObjects: CoreStart['savedObjects'];
  uiSettings: CoreStart['uiSettings'];
}

const fixedPageSize = 8;

export function SourcePicker({
  savedObjects,
  uiSettings,
  currentIndexPattern,
  onIndexPatternSelected,
}: SourcePickerProps) {
  return (
    <SavedObjectFinder
      savedObjects={savedObjects}
      uiSettings={uiSettings}
      onChoose={(_id, _type, _name, indexPattern) => {
        onIndexPatternSelected(indexPattern as IndexPatternSavedObject);
      }}
      showFilter={false}
      noItemsMessage={i18n.translate('xpack.graph.sourceModal.notFoundLabel', {
        defaultMessage: 'No matching indices found.',
      })}
      savedObjectMetaData={[
        {
          type: 'index-pattern',
          getIconForSavedObject: () => 'indexPatternApp',
          name: i18n.translate('xpack.graph.sourceModal.savedObjectType.indexPattern', {
            defaultMessage: 'Index pattern',
          }),
          showSavedObject: indexPattern =>
            !indexPattern.attributes.type &&
            (!currentIndexPattern || currentIndexPattern.id !== indexPattern.id),
        },
      ]}
      fixedPageSize={fixedPageSize}
    />
  );
}
