/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS, JSON as json, KIBANA as kibana, PDF as pdf, URL as url } from './constants';

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
    getCopyAssetTooltip: () =>
      i18n.translate('xpack.canvas.asset.copyAssetTooltip', {
        defaultMessage: 'Copy id to clipboard',
      }),
    getCreateImageTooltip: () =>
      i18n.translate('xpack.canvas.asset.createImageTooltip', {
        defaultMessage: 'Create image element',
      }),
    getDeleteAssetTooltip: () =>
      i18n.translate('xpack.canvas.asset.deleteAssetTooltip', {
        defaultMessage: 'Delete',
      }),
    getDownloadAssetTooltip: () =>
      i18n.translate('xpack.canvas.asset.downloadAssetTooltip', {
        defaultMessage: 'Download',
      }),
    getThumbnailAltText: () =>
      i18n.translate('xpack.canvas.asset.thumbnailAltText', {
        defaultMessage: 'Asset thumbnail',
      }),
  },
  AssetManager: {
    getButtonLabel: () =>
      i18n.translate('xpack.canvas.assetManager.manageButtonLabel', {
        defaultMessage: 'Manage assets',
      }),
    getConfirmModalButtonLabel: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalButtonLabel', {
        defaultMessage: 'Remove',
      }),
    getConfirmModalMessageText: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalDetail', {
        defaultMessage: 'Are you sure you want to remove this asset?',
      }),
    getConfirmModalTitle: () =>
      i18n.translate('xpack.canvas.assetManager.confirmModalTitle', {
        defaultMessage: 'Remove Asset',
      }),
  },
  AssetModal: {
    getDescription: () =>
      i18n.translate('xpack.canvas.assetModal.modalDescription', {
        defaultMessage:
          'Below are the image assets in this workpad. Any assets that are currently in use cannot be determined at this time. To reclaim space, delete assets.',
      }),
    getEmptyAssetsDescription: () =>
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
    getModalCloseButtonLabel: () =>
      i18n.translate('xpack.canvas.assetModal.modalCloseButtonLabel', {
        defaultMessage: 'Close',
      }),
    getModalTitle: () =>
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
    getAddElementButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementButtonLabel', {
        defaultMessage: 'Add element',
      }),
    getAddElementModalCloseButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeader.addElementModalCloseButtonLabel', {
        defaultMessage: 'Close',
      }),
    getEmbedObjectButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeader.embedObjectButtonLabel', {
        defaultMessage: 'Embed object',
      }),
    getFullScreenButtonAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadHeader.fullscreenButtonAriaLabel', {
        defaultMessage: 'View fullscreen',
      }),
    getFullScreenTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeader.fullscreenTooltip', {
        defaultMessage: 'Enter fullscreen mode',
      }),
    getHideEditControlTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeader.hideEditControlTooltip', {
        defaultMessage: 'Hide editing controls',
      }),
    getNoWritePermissionTooltipText: () =>
      i18n.translate('xpack.canvas.workpadHeader.noWritePermissionTooltip', {
        defaultMessage: "You don't have permission to edit this workpad",
      }),
    getShowEditControlTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeader.showEditControlTooltip', {
        defaultMessage: 'Show editing controls',
      }),
  },
  WorkpadHeaderAutoRefreshControls: {
    getDisableTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.disableTooltip', {
        defaultMessage: 'Disable auto-refresh',
      }),
    getIntervalFormLabelText: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.intervalFormLabel', {
        defaultMessage: 'Change auto-refresh interval',
      }),
    getRefreshListDurationManualText: () =>
      i18n.translate(
        'xpack.canvas.workpadHeaderAutoRefreshControls.refreshListDurationManualText',
        {
          defaultMessage: 'Manually',
        }
      ),
    getRefreshListTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderAutoRefreshControls.refreshListTitle', {
        defaultMessage: 'Refresh elements',
      }),
  },
  WorkpadHeaderControlSettings: {
    getTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeaderControlSettings.settingsTooltip', {
        defaultMessage: 'Control settings',
      }),
  },
  WorkpadHeaderCustomInterval: {
    getButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.confirmButtonLabel', {
        defaultMessage: 'Set',
      }),
    getFormDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formDescription', {
        defaultMessage:
          'Use shorthand notation, like {secondsExample}, {minutesExample}, or {hoursExample}',
        values: {
          secondsExample: '30s',
          minutesExample: '10m',
          hoursExample: '1h',
        },
      }),
    getFormLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formLabel', {
        defaultMessage: 'Set a custom interval',
      }),
  },
  WorkpadHeaderKioskControls: {
    getCycleFormLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.cycleFormLabel', {
        defaultMessage: 'Change cycling interval',
      }),
    getCycleToggleSwitch: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.cycleToggleSwitch', {
        defaultMessage: 'Cycle slides automatically',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderKioskControl.controlTitle', {
        defaultMessage: 'Cycle fullscreen pages',
      }),
  },
  WorkpadHeaderRefreshControlSettings: {
    getRefreshAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshAriaLabel', {
        defaultMessage: 'Refresh Elements',
      }),
    getRefreshTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeaderRefreshControlSettings.refreshTooltip', {
        defaultMessage: 'Refresh data',
      }),
  },
  WorkpadHeaderWorkpadExport: {
    getCopyPDFMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.copyPDFMessage', {
        defaultMessage: 'The {pdf} generation {url} was copied to your clipboard.',
        values: {
          pdf,
          url,
        },
      }),
    getCopyReportingConfigMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.copyReportingConfigMessage', {
        defaultMessage: 'Copied reporting configuration to clipboard',
      }),
    getExportPDFErrorTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFErrorMessage', {
        defaultMessage: "Failed to create {pdf} for '{workpadName}'",
        values: {
          pdf,
          workpadName,
        },
      }),
    getExportPDFMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFMessage', {
        defaultMessage: 'Exporting {pdf}. You can track the progress in Management.',
        values: {
          pdf,
        },
      }),
    getExportPDFTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFTitle', {
        defaultMessage: "{pdf} export of workpad '{workpadName}'",
        values: {
          pdf,
          workpadName,
        },
      }),
    getPDFPanelCopyAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyAriaLabel', {
        defaultMessage:
          'Alternatively, you can generate a {pdf} from a script or with Watcher by using this {url}. Press Enter to copy the {url} to clipboard.',
        values: {
          pdf,
          url,
        },
      }),
    getPDFPanelCopyButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyButtonLabel', {
        defaultMessage: 'Copy {post} {url}',
        values: {
          post: 'POST',
          url,
        },
      }),
    getPDFPanelCopyDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyDescription', {
        defaultMessage:
          'Alternatively, copy this {post} {url} to call generation from outside {kibana} or from Watcher.',
        values: {
          post: 'POST',
          kibana,
          url,
        },
      }),
    getPDFPanelGenerateDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateDescription', {
        defaultMessage:
          '{pdf}s can take a minute or two to generate based on the size of your workpad.',
        values: {
          pdf,
        },
      }),
    getPDFPanelGenerateButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateButtonLabel', {
        defaultMessage: 'Generate {pdf}',
        values: {
          pdf,
        },
      }),
    getShareDownloadJSONTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareDownloadJSONTitle', {
        defaultMessage: 'Download as {json}',
        values: {
          json,
        },
      }),
    getShareDownloadPDFTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareDownloadPDFTitle', {
        defaultMessage: '{pdf} reports',
        values: {
          pdf,
        },
      }),
    getShareWorkpadMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareWorkpadMessage', {
        defaultMessage: 'Share this workpad',
      }),
    getUnknownExportErrorMessage: (type: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.unknownExportErrorMessage', {
        defaultMessage: 'Unknown export type: {type}',
        values: {
          type,
        },
      }),
  },
};
