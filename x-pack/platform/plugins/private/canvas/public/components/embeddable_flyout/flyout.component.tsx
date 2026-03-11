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
import { contentManagementService, coreServices } from '../../services/kibana_services';
import { getCanvasNotifyService } from '../../services/canvas_notify_service';

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

export interface Props {
  onClose: () => void;
  container: CanAddNewPanel;
}

export const AddEmbeddableFlyout: FC<Props> = ({ container, onClose }) => {
  const modalTitleId = useGeneratedHtmlId();

  const libraryTypes = useAddFromLibraryTypes();

  const canvasOnlyLibraryTypes = useMemo(() => {
    // Links panels are not supported in Canvas
    return libraryTypes.filter(({ type }) => type !== 'links');
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
          savedObjectMetaData={canvasOnlyLibraryTypes}
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
