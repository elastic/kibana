/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';

import { getAddFromLibraryType, useAddFromLibraryTypes } from '@kbn/embeddable-plugin/public';
import type { SavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedSearchType } from '@kbn/saved-search-plugin/public';
import { VISUALIZE_SAVED_OBJECT_TYPE } from '@kbn/visualizations-common';
import { LENS_CONTENT_TYPE } from '@kbn/lens-common/content_management/constants';
import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/public';
import { getCanvasNotifyService } from '../../services/canvas_notify_service';
import { contentManagementService, coreServices } from '../../services/kibana_services';

const strings = {
  getNoItemsText: () =>
    i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
  getTitleText: () =>
    i18n.translate('xpack.canvas.embedObject.titleText', {
      defaultMessage: 'Add from library',
    }),
};

const CANVAS_LIBRARY_TYPES = [
  SavedSearchType,
  VISUALIZE_SAVED_OBJECT_TYPE,
  LENS_CONTENT_TYPE,
  MAP_SAVED_OBJECT_TYPE,
];

export interface Props {
  onClose: () => void;
  container: CanAddNewPanel;
}

export const AddEmbeddableFlyout: FC<Props> = ({ container, onClose }) => {
  const modalTitleId = useGeneratedHtmlId();

  const libraryTypes = useAddFromLibraryTypes();

  const canvasLibraryTypes = useMemo(() => {
    return libraryTypes.filter(({ type }) => CANVAS_LIBRARY_TYPES.includes(type));
  }, [libraryTypes]);

  const onChoose: SavedObjectFinderProps['onChoose'] = useCallback(
    async (
      id: SavedObjectCommon['id'],
      type: SavedObjectCommon['type'],
      name: string,
      savedObject: SavedObjectCommon
    ) => {
      const libraryType = getAddFromLibraryType(type);
      if (!libraryType) {
        getCanvasNotifyService().warning(
          i18n.translate('xpack.canvas.addPanel.typeNotFound', {
            defaultMessage: 'Unable to load type: {type}',
            values: { type },
          })
        );
        return;
      }
      libraryType.onAdd(container, savedObject);
    },
    [container]
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      data-test-subj="dashboardAddPanel"
      aria-labelledby={modalTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={modalTitleId}>{strings.getTitleText()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinder
          id="canvasEmbeddableFlyout"
          onChoose={onChoose}
          savedObjectMetaData={canvasLibraryTypes}
          showFilter={true}
          noItemsMessage={strings.getNoItemsText()}
          services={{
            contentClient: contentManagementService.client,
            uiSettings: coreServices.uiSettings,
          }}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
