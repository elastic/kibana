/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS } from './constants';

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
      i18n.translate('xpack.canvas.asset.copyAssetTooltip', {
        defaultMessage: 'Copy id to clipboard',
      }),
    getCreateImageTooltipText: () =>
      i18n.translate('xpack.canvas.asset.createImageTooltip', {
        defaultMessage: 'Create image element',
      }),
    getDeleteAssetTooltipText: () =>
      i18n.translate('xpack.canvas.asset.deleteAssetTooltip', {
        defaultMessage: 'Delete',
      }),
    getDownloadAssetTooltipText: () =>
      i18n.translate('xpack.canvas.asset.downloadAssetTooltip', {
        defaultMessage: 'Download',
      }),
    getThumbnailAltText: () =>
      i18n.translate('xpack.canvas.asset.thumbnailAltText', {
        defaultMessage: 'Asset thumbnail',
      }),
  },
  AssetManager: {
    getBtnText: () =>
      i18n.translate('xpack.canvas.assetManager.manageButtonLabel', {
        defaultMessage: 'Manage assets',
      }),
    getConfirmModalBtnText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalButtonLabel', {
        defaultMessage: 'Remove',
      }),
    getConfirmModalMessageText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalDetail', {
        defaultMessage: 'Are you sure you want to remove this asset?',
      }),
    getConfirmModalTitleText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalTitle', {
        defaultMessage: 'Remove Asset',
      }),
  },
  AssetModal: {
    getDescriptionText: () =>
      i18n.translate('xpack.canvas.assetModal.modalDescription', {
        defaultMessage:
          'Below are the image assets in this workpad. Any assets that are currently in use cannot be determined at this time. To reclaim space, delete assets.',
      }),
    getEmptyAssetsMessageText: () =>
      i18n.translate('xpack.canvas.assetModal.emptyAssetsDescription', {
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
      i18n.translate('xpack.canvas.assetModal.modalCloseButtonLabel', {
        defaultMessage: 'Close',
      }),
    getModalTitleText: () =>
      i18n.translate('xpack.canvas.assetModal.modalTitle', {
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
  HelpMenu: {
    getHelpMenuDescription: () =>
      i18n.translate('xpack.canvas.helpMenu.description', {
        defaultMessage: 'For {CANVAS} specific information',
        values: {
          CANVAS,
        },
      }),
    getDocumentationLinkLabel: () =>
      i18n.translate('xpack.canvas.helpMenu.documentationLinkLabel', {
        defaultMessage: '{CANVAS} documentation',
        values: {
          CANVAS,
        },
      }),
    getKeyboardShortcutsLinkLabel: () =>
      i18n.translate('xpack.canvas.helpMenu.keyboardShortcutsLinkLabel', {
        defaultMessage: 'Keyboard Shortcuts',
      }),
  },
  KeyboardShortcutsDoc: {
    getTitle: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyoutHeaderTitle', {
        defaultMessage: 'Keyboard Shortcuts',
      }),
    getShortcutSeparator: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.shortcutListSeparator', {
        defaultMessage: 'or',
        description:
          'Separates which keyboard shortcuts can be used for a single action. Example: "{shortcut1} or {shortcut2} or {shortcut3}"',
      }),
    getFlyoutCloseButtonAriaLabel: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyout.closeButtonAriaLabel', {
        defaultMessage: 'Closes keyboard shortcuts reference',
      }),
  },
  WorkpadHeader: {
    getAddElementBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementButtonLabel', {
        defaultMessage: 'Add element',
      }),
    getAddElementModalCloseBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementModalCloseButtonLabel', {
        defaultMessage: 'Close',
      }),
    getEmbedObjectBtnText: () =>
      i18n.translate('xpack.canvas.workpadHeader.embedObjectButtonLabel', {
        defaultMessage: 'Embed object',
      }),
    getFullScreenTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeader.fullscreenTooltip', {
        defaultMessage: 'Enter fullscreen mode',
      }),
    getFullScreenButtonLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeader.fullscreenButtonAriaLabel', {
        defaultMessage: 'View fullscreen',
      }),
    getHideEditControlText: () =>
      i18n.translate('xpack.canvas.workpadHeader.hideEditControlTooltip', {
        defaultMessage: 'Hide editing controls',
      }),
    getNoWritePermText: () =>
      i18n.translate('xpack.canvas.workpadHeader.noWritePermissionTooltip', {
        defaultMessage: "You don't have permission to edit this workpad",
      }),
    getShowEditControlText: () =>
      i18n.translate('xpack.canvas.workpadHeader.showEditControlTooltip', {
        defaultMessage: 'Show editing controls',
      }),
  },
  WorkpadHeaderAutoRefreshControls: {
    getRefreshListTitleText: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.refreshListTitle', {
        defaultMessage: 'Refresh elements',
      }),
    getRefreshListDurationManualText: () =>
      i18n.translate(
        'xpack.canvas.workpadHeaderAutoRefreshControls.refreshListDurationManualText',
        {
          defaultMessage: 'Manually',
        }
      ),
    getDisableTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.disableTooltip', {
        defaultMessage: 'Disable auto-refresh',
      }),
    getIntervalFormLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.intervalFormLabel', {
        defaultMessage: 'Change auto-refresh interval',
      }),
  },
  WorkpadHeaderControlSettings: {
    getTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeaderControlSettings.settingsTooltip', {
        defaultMessage: 'Control settings',
      }),
  },
  WorkpadHeaderCustomInterval: {
    getFormLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formLabel', {
        defaultMessage: 'Set a custom interval',
      }),
    getFormHelpText: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formDescription', {
        defaultMessage:
          'Use shorthand notation, like {secondsExample}, {minutesExample}, or {hoursExample}',
        values: {
          secondsExample: '30s',
          minutesExample: '10m',
          hoursExample: '1h',
        },
      }),
    getButtonText: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.confirmButtonLabel', {
        defaultMessage: 'Set',
      }),
  },
  WorkpadHeaderKioskControls: {
    getTitleText: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.controlTitle', {
        defaultMessage: 'Cycle fullscreen pages',
      }),
    getCycleSwitchLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.cycleToggleSwitch', {
        defaultMessage: 'Cycle slides automatically',
      }),
    getCycleFormLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.cycleFormLabel', {
        defaultMessage: 'Change cycling interval',
      }),
  },
  WorkpadHeaderRefreshControlSettings: {
    getTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshTooltip', {
        defaultMessage: 'Refresh data',
      }),
    getButtonLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshAriaLabel', {
        defaultMessage: 'Refresh Elements',
      }),
  },
};
