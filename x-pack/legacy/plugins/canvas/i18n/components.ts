/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS, HTML, JSON, KIBANA, PDF, POST, URL, ZIP } from './constants';

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
  App: {
    getLoadErrorMessage: (error: string) =>
      i18n.translate('xpack.canvas.app.loadErrorMessage', {
        defaultMessage: 'Message: {error}',
        values: {
          error,
        },
      }),
    getLoadErrorTitle: () =>
      i18n.translate('xpack.canvas.app.loadErrorTitle', {
        defaultMessage: 'Canvas failed to load :(',
      }),
    getLoadingMessage: () =>
      i18n.translate('xpack.canvas.app.loadingMessage', {
        defaultMessage: 'Canvas is loading',
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
  AssetPicker: {
    getAssetAltText: () =>
      i18n.translate('xpack.canvas.assetpicker.assetAltText', {
        defaultMessage: 'Asset thumbnail',
      }),
  },
  ColorManager: {
    getAddAriaLabel: () =>
      i18n.translate('xpack.canvas.colorManager.addAriaLabel', {
        defaultMessage: 'Add Color',
      }),
    getCodePlaceholder: () =>
      i18n.translate('xpack.canvas.colorManager.codePlaceholder', {
        defaultMessage: 'Color code',
      }),
    getRemoveAriaLabel: () =>
      i18n.translate('xpack.canvas.colorManager.removeAriaLabel', {
        defaultMessage: 'Remove Color',
      }),
  },
  HelpMenu: {
    getDocumentationLinkLabel: () =>
      i18n.translate('xpack.canvas.helpMenu.documentationLinkLabel', {
        defaultMessage: '{CANVAS} documentation',
        values: {
          CANVAS,
        },
      }),
    getHelpMenuDescription: () =>
      i18n.translate('xpack.canvas.helpMenu.description', {
        defaultMessage: 'For {CANVAS} specific information',
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
    getFlyoutCloseButtonAriaLabel: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyout.closeButtonAriaLabel', {
        defaultMessage: 'Closes keyboard shortcuts reference',
      }),
    getShortcutSeparator: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.shortcutListSeparator', {
        defaultMessage: 'or',
        description:
          'Separates which keyboard shortcuts can be used for a single action. Example: "{shortcut1} or {shortcut2} or {shortcut3}"',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.keyboardShortcutsDoc.flyoutHeaderTitle', {
        defaultMessage: 'Keyboard Shortcuts',
      }),
  },
  ShareWebsiteFlyout: {
    getRuntimeStepTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.downloadRuntimeTitle', {
        defaultMessage: 'Download runtime',
      }),
    getSnippentsStepTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.addSnippetsTitle', {
        defaultMessage: 'Add snippets to website',
      }),
    getStepsDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.description', {
        defaultMessage:
          'Follow these steps to share a static version of this workpad on an external website. It will be a visual snapshot of the current workpad, and will not have access to live data.',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.flyoutTitle', {
        defaultMessage: 'Share on a website',
      }),
    getWorkpadStepTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.downloadWorkpadTitle', {
        defaultMessage: 'Download workpad',
      }),
  },
  ShareWebsiteRuntimeStep: {
    getDownloadLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.downloadLabel', {
        defaultMessage: 'Download runtime.',
      }),
    getStepDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.description', {
        defaultMessage:
          'In order to render a shareable Workpad, you also need to include the {CANVAS} Shareable Workpad Runtime. You can skip this step if the runtime is already included on your website.',
        values: {
          CANVAS,
        },
      }),
  },
  ShareWebsiteSnippetsStep: {
    getAutoplayParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.autoplayParameterDescription', {
        defaultMessage: 'Should the runtime automatically move through the pages of the workpad?',
      }),
    getCallRuntimeLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.callRuntimeLabel', {
        defaultMessage: 'Call Runtime',
      }),
    getHeightParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.heightParameterDescription', {
        defaultMessage: 'The height of the Workpad. Defaults to the Workpad height.',
      }),
    getIncludeRuntimeLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.includeRuntimeLabel', {
        defaultMessage: 'Include Runtime',
      }),
    getIntervalParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.intervalParameterDescription', {
        defaultMessage:
          'The interval upon which the pages will advance in time format, (e.g. {twoSeconds}, {oneMinute})',
        values: {
          twoSeconds: '2s',
          oneMinute: '1m',
        },
      }),
    getPageParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.pageParameterDescription', {
        defaultMessage: 'The page to display. Defaults to the page specified by the Workpad.',
      }),
    getParametersDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.parametersDescription', {
        defaultMessage:
          'There are a number of inline parameters to configure the shareable Workpad.',
      }),
    getParametersTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.parametersLabel', {
        defaultMessage: 'Parameters',
      }),
    getPlaceholderLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.placeholderLabel', {
        defaultMessage: 'Placeholder',
      }),
    getRequiredLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.requiredLabel', {
        defaultMessage: 'required',
      }),
    getShareableParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.shareableParameterDescription', {
        defaultMessage: 'The type of shareable. In this case, a {CANVAS} Workpad.',
        values: {
          CANVAS,
        },
      }),
    getSnippetsStepDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.description', {
        defaultMessage:
          'The Workpad is placed within the {HTML} of the site by using an {HTML} placeholder. Parameters for the runtime are included inline. See the full list of parameters below. You can include more than one workpad on the page.',
        values: {
          HTML,
        },
      }),
    getToolbarParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.toolbarParameterDescription', {
        defaultMessage: 'Should the toolbar be hidden?',
      }),
    getUrlParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.urlParameterDescription', {
        defaultMessage: 'The {URL} of the Shareable Workpad {JSON} file.',
        values: {
          URL,
          JSON,
        },
      }),
    getWidthParameterDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.widthParameterDescription', {
        defaultMessage: 'The width of the Workpad. Defaults to the Workpad width.',
      }),
  },
  ShareWebsiteWorkpadStep: {
    getDownloadLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.workpadStep.downloadLabel', {
        defaultMessage: 'Download workpad.',
      }),
    getStepDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.workpadStep.description', {
        defaultMessage:
          'The workpad will be exported as a single {JSON} file for sharing in another site.',
        values: {
          JSON,
        },
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
        defaultMessage: 'The {PDF} generation {URL} was copied to your clipboard.',
        values: {
          PDF,
          URL,
        },
      }),
    getCopyReportingConfigMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.copyReportingConfigMessage', {
        defaultMessage: 'Copied reporting configuration to clipboard',
      }),
    getCopyShareConfigMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.copyReportingConfigMessage', {
        defaultMessage: 'Copied share markup to clipboard',
      }),
    getExportPDFErrorTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFErrorMessage', {
        defaultMessage: "Failed to create {PDF} for '{workpadName}'",
        values: {
          PDF,
          workpadName,
        },
      }),
    getExportPDFMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFMessage', {
        defaultMessage: 'Exporting {PDF}. You can track the progress in Management.',
        values: {
          PDF,
        },
      }),
    getExportPDFTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.exportPDFTitle', {
        defaultMessage: "{PDF} export of workpad '{workpadName}'",
        values: {
          PDF,
          workpadName,
        },
      }),
    getPDFPanelCopyAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyAriaLabel', {
        defaultMessage:
          'Alternatively, you can generate a {PDF} from a script or with Watcher by using this {URL}. Press Enter to copy the {URL} to clipboard.',
        values: {
          PDF,
          URL,
        },
      }),
    getPDFPanelCopyButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyButtonLabel', {
        defaultMessage: 'Copy {POST} {URL}',
        values: {
          POST,
          URL,
        },
      }),
    getPDFPanelCopyDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelCopyDescription', {
        defaultMessage:
          'Alternatively, copy this {POST} {URL} to call generation from outside {KIBANA} or from Watcher.',
        values: {
          POST,
          KIBANA,
          URL,
        },
      }),
    getPDFPanelGenerateButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateButtonLabel', {
        defaultMessage: 'Generate {PDF}',
        values: {
          PDF,
        },
      }),
    getPDFPanelGenerateDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateDescription', {
        defaultMessage:
          '{PDF}s can take a minute or two to generate based on the size of your workpad.',
        values: {
          PDF,
        },
      }),
    getShareableZipErrorTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareWebsiteErrorTitle', {
        defaultMessage:
          "Failed to create {ZIP} file for '{workpadName}'. The workpad may be too large. You'll need to download the files separately.",
        values: {
          ZIP,
          workpadName,
        },
      }),
    getShareDownloadJSONTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareDownloadJSONTitle', {
        defaultMessage: 'Download as {JSON}',
        values: {
          JSON,
        },
      }),
    getShareDownloadPDFTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareDownloadPDFTitle', {
        defaultMessage: '{PDF} reports',
        values: {
          PDF,
        },
      }),
    getShareWebsiteTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.shareWebsiteTitle', {
        defaultMessage: 'Share on a website',
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
  WorkpadHeaderWorkpadZoom: {
    getZoomControlsAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomControlsAriaLabel', {
        defaultMessage: 'Zoom controls',
      }),
    getZoomControlsTooltip: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomControlsTooltip', {
        defaultMessage: 'Zoom controls',
      }),
    getZoomFitToWindowText: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomFitToWindowText', {
        defaultMessage: 'Fit to window',
      }),
    getZoomInText: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomInText', {
        defaultMessage: 'Zoom in',
      }),
    getZoomOutText: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomOutText', {
        defaultMessage: 'Zoom out',
      }),
    getZoomPanelTitle: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomPanelTitle', {
        defaultMessage: 'Zoom',
      }),
    getZoomPercentage: (scale: number) =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomResetText', {
        defaultMessage: '{scalePercentage}%',
        values: {
          scalePercentage: scale * 100,
        },
      }),
    getZoomResetText: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadZoom.zoomPrecentageValue', {
        defaultMessage: 'Reset',
      }),
  },
};
