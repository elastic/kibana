/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ComponentStrings = {
  AddEmbeddableFlyout: {
    getNoItemsText: () =>
      i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
        defaultMessage: 'No matching objects found.',
      }),
    getTitleText: () =>
      i18n.translate('xpack.canvas.embedObject.titleText', {
        defaultMessage: 'Embed Object',
      }),
  },
  Asset: {
    getCopyAssetTooltipText: () =>
      i18n.translate('xpack.canvas.asset.copyAssetTooltipText', {
        defaultMessage: 'Copy id to clipboard',
      }),
    getCreateImageTooltipText: () =>
      i18n.translate('xpack.canvas.asset.createImageTooltipText', {
        defaultMessage: 'Create image element',
      }),
    getDeleteAssetTooltipText: () =>
      i18n.translate('xpack.canvas.asset.deleteAssetTooltipText', {
        defaultMessage: 'Delete',
      }),
    getDownloadAssetTooltipText: () =>
      i18n.translate('xpack.canvas.asset.downloadAssetTooltipText', {
        defaultMessage: 'Download',
      }),
    getThumbnailAltText: () =>
      i18n.translate('xpack.canvas.asset.thumbnailAltText', {
        defaultMessage: 'Asset thumbnail',
      }),
  },
  AssetManager: {
    getBtnText: () =>
      i18n.translate('xpack.canvas.assetManager.buttonText', {
        defaultMessage: 'Manage assets',
      }),
    getConfirmModalBtnText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalButtonText', {
        defaultMessage: 'Remove',
      }),
    getConfirmModalMessageText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalMessage', {
        defaultMessage: 'Are you sure you want to remove this asset?',
      }),
    getConfirmModalTitleText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalTitleText', {
        defaultMessage: 'Remove Asset',
      }),
  },
  AssetModal: {
    getDescriptionText: () =>
      i18n.translate('xpack.canvas.assetModal.descriptionText', {
        defaultMessage:
          'Below are the image assets in this workpad. Any assets that are currently in use cannot be determined at this time. To reclaim space, delete assets.',
      }),
    getEmptyAssetsMessageText: () =>
      i18n.translate('xpack.canvas.assetModal.emptyAssetsMessage', {
        defaultMessage: 'Import your assets to get started',
      }),
    getFilePickerPromptText: () =>
      i18n.translate('xpack.canvas.assetModal.filePickerPromptText', {
        defaultMessage: 'Select or drag and drop images',
      }),
    getLoadingText: () =>
      i18n.translate('xpack.canvas.assetModal.loadingText', {
        defaultMessage: 'Uploading images',
      }),
    getModalCloseBtnText: () =>
      i18n.translate('xpack.canvas.assetModal.modalCloseButtonText', {
        defaultMessage: 'Close',
      }),
    getModalTitleText: () =>
      i18n.translate('xpack.canvas.assetModal.modalTitleText', {
        defaultMessage: 'Manage workpad assets',
      }),
    getSpaceUsedText: (percentageUsed: number) =>
      i18n.translate('xpack.canvas.assetModal.spacedUsedText', {
        defaultMessage: '{percentageUsed}% space used',
        values: {
          percentageUsed,
        },
      }),
  },
  WorkpadHeader: {
    getAddElementBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementButtonText', {
        defaultMessage: 'Add element',
      }),
    getAddElementModalCloseBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementModalCloseButtonText', {
        defaultMessage: 'Close',
      }),
    getEmbedObjectBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.embedObjectButtonText', {
        defaultMessage: 'Embed object',
      }),
    getFullScreenTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeader.fullscreenTooltipText', {
        defaultMessage: 'Enter fullscreen mode',
      }),
    getHideEditControlText: () =>
      i18n.translate('xpack.canvas.workpadHeader.hideEditControlText', {
        defaultMessage: 'Hide editing controls',
      }),
    getNoWritePermText: () =>
      i18n.translate('xpack.canvas.workpadHeader.noWritePermissionText', {
        defaultMessage: "You don't have permission to edit this workpad",
      }),
    getShowEditControlText: () =>
      i18n.translate('xpack.canvas.workpadHeader.showEditControlText', {
        defaultMessage: 'Show editing controls',
      }),
  },
};
