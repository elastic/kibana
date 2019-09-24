/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CANVAS, JSON, KIBANA, PDF, POST, URL } from './constants';

export const ComponentStrings = {
  App: {
    getLoadErrorTitle: () =>
      i18n.translate('xpack.canvas.app.loadErrorTitle', {
        defaultMessage: 'Canvas failed to load :(',
      }),
    getLoadErrorMessage: (error: string) =>
      i18n.translate('xpack.canvas.app.loadErrorMessage', {
        defaultMessage: 'Message: {error}',
        values: {
          error,
        },
      }),
    getLoadingMessage: () =>
      i18n.translate('xpack.canvas.app.loadingMessage', {
        defaultMessage: 'Canvas is loading',
      }),
  },
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
  DatasourceDatasourceComponent: {
    getChangeButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.changeButtonLabel', {
        defaultMessage: 'Change your data source',
      }),
    getPreviewButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.previewButtonLabel', {
        defaultMessage: 'Preview',
      }),
    getSaveButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.saveButtonLabel', {
        defaultMessage: 'Save',
      }),
  },
  DatasourceNoDatasource: {
    getPanelDescription: () =>
      i18n.translate('xpack.canvas.datasourceNoDatasource.panelDescription', {
        defaultMessage:
          "This element does not have an attached data source. This is usually because the element is an image or other static asset. If that's not the case you might want to check your expression to make sure it is not malformed.",
      }),
    getPanelTitle: () =>
      i18n.translate('xpack.canvas.datasourceNoDatasource.panelTitle', {
        defaultMessage: 'No data source present',
      }),
  },
  DatasourceDatasourcePreview: {
    getEmptyFirstLineDescription: () =>
      i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptyFirstLineDescription', {
        defaultMessage: "We couldn't find any documents matching your search criteria.",
      }),
    getEmptySecondLineDescription: () =>
      i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptySecondLineDescription', {
        defaultMessage: 'Check your datasource settings and try again.',
      }),
    getEmptyTitle: () =>
      i18n.translate('xpack.canvas.datasourceDatasourcePreview.emptyTitle', {
        defaultMessage: 'No documents found',
      }),
    getModalTitle: () =>
      i18n.translate('xpack.canvas.datasourceDatasourcePreview.modalTitle', {
        defaultMessage: 'Datasource preview',
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
  WorkpadCreate: {
    getWorkpadCreateButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadCreate.createButtonLabel', {
        defaultMessage: 'Create workpad',
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
    getPDFPanelGenerateDescription: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateDescription', {
        defaultMessage:
          '{PDF}s can take a minute or two to generate based on the size of your workpad.',
        values: {
          PDF,
        },
      }),
    getPDFPanelGenerateButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.pdfPanelGenerateButtonLabel', {
        defaultMessage: 'Generate {PDF}',
        values: {
          PDF,
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
  WorkpadLoader: {
    getClonedWorkpadName: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadLoader.clonedWorkpadName', {
        defaultMessage: 'Copy of {workpadName}',
        values: {
          workpadName,
        },
        description:
          'This suffix is added to the end of the name of a cloned workpad to indicate that this ' +
          'new workpad is a copy of the original workpad. Example: "Copy of Sales Pitch"',
      }),
    getCloneToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.cloneTooltip', {
        defaultMessage: 'Clone workpad',
      }),
    getCreateWorkpadLoadingDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.createWorkpadLoadingDescription', {
        defaultMessage: 'Creating workpad...',
        description:
          'This message appears while the user is waiting for a new workpad to be created',
      }),
    getDeleteButtonAriaLabel: (numberOfWorkpads: number) =>
      i18n.translate('xpack.canvas.workpadLoader.deleteButtonAriaLabel', {
        defaultMessage: 'Delete {numberOfWorkpads} workpads',
        values: {
          numberOfWorkpads,
        },
      }),
    getDeleteButtonLabel: (numberOfWorkpads: number) =>
      i18n.translate('xpack.canvas.workpadLoader.deleteButtonLabel', {
        defaultMessage: 'Delete ({numberOfWorkpads})',
        values: {
          numberOfWorkpads,
        },
      }),
    getDeleteMultipleWorkpadModalTitle: (numberOfWorkpads: string) =>
      i18n.translate('xpack.canvas.workpadLoader.deleteMultipleWorkpadsModalTitle', {
        defaultMessage: 'Delete {numberOfWorkpads} workpads?',
        values: {
          numberOfWorkpads,
        },
      }),
    getDeleteSingleWorkpadModalTitle: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadLoader.deleteSingleWorkpadModalTitle', {
        defaultMessage: `Delete workpad '{workpadName}'?`,
        values: {
          workpadName,
        },
      }),
    getDeleteModalConfirmButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadLoader.deleteModalConfirmButtonLabel', {
        defaultMessage: 'Delete',
      }),
    getDeleteModalDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.deleteModalDescription', {
        defaultMessage: `You can't recover deleted workpads.`,
      }),
    getEmptyPromptTitle: () =>
      i18n.translate('xpack.canvas.workpadLoader.emptyPromptTitle', {
        defaultMessage: 'Add your first workpad',
      }),
    getEmptyPromptGettingStartedDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.emptyPromptGettingStartedDescription', {
        defaultMessage:
          'Create a new workpad, start from a template, or import a workpad {JSON} file by dropping it here.',
        values: {
          JSON,
        },
      }),
    getEmptyPromptNewUserDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.emptyPromptNewUserDescription', {
        defaultMessage: 'New to {CANVAS}?',
        values: {
          CANVAS,
        },
      }),
    getExportButtonAriaLabel: (numberOfWorkpads: number) =>
      i18n.translate('xpack.canvas.workpadLoader.exportButtonAriaLabel', {
        defaultMessage: 'Export {numberOfWorkpads} workpads',
        values: {
          numberOfWorkpads,
        },
      }),
    getExportButtonLabel: (numberOfWorkpads: number) =>
      i18n.translate('xpack.canvas.workpadLoader.exportButtonLabel', {
        defaultMessage: 'Export ({numberOfWorkpads})',
        values: {
          numberOfWorkpads,
        },
      }),
    getExportToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.exportTooltip', {
        defaultMessage: 'Export workpad',
      }),
    getFetchLoadingDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.fetchLoadingDescription', {
        defaultMessage: 'Fetching workpads...',
        description:
          'This message appears while the user is waiting for their list of workpads to load',
      }),
    getFilePickerPlaceholder: () =>
      i18n.translate('xpack.canvas.workpadLoader.filePickerPlaceholder', {
        defaultMessage: 'Import workpad {JSON} file',
        values: {
          JSON,
        },
      }),
    getLoadWorkpadArialLabel: (workpadName: string) =>
      i18n.translate('xpack.canvas.workpadLoader.loadWorkpadArialLabel', {
        defaultMessage: `Load workpad '{workpadName}'`,
        values: {
          workpadName,
        },
      }),
    getNoPermissionToCloneToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.noPermissionToCloneToolTip', {
        defaultMessage: `You don't have permission to clone workpads`,
      }),
    getNoPermissionToCreateToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.noPermissionToCreateToolTip', {
        defaultMessage: `You don't have permission to create workpads`,
      }),
    getNoPermissionToDeleteToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.noPermissionToDeleteToolTip', {
        defaultMessage: `You don't have permission to delete workpads`,
      }),
    getNoPermissionToUploadToolTip: () =>
      i18n.translate('xpack.canvas.workpadLoader.noPermissionToUploadToolTip', {
        defaultMessage: `You don't have permission to upload workpads`,
      }),
    getSampleDataLinkLabel: () =>
      i18n.translate('xpack.canvas.workpadLoader.sampleDataLinkLabel', {
        defaultMessage: 'Add your first workpad',
      }),
    getTableCreatedColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadLoader.table.createdColumnTitle', {
        defaultMessage: 'Created',
        description: 'This column in the table contains the date/time the workpad was created.',
      }),
    getTableNameColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadLoader.table.nameColumnTitle', {
        defaultMessage: 'Workpad name',
      }),
    getTableUpdatedColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadLoader.table.updatedColumnTitle', {
        defaultMessage: 'Updated',
        description:
          'This column in the table contains the date/time the workpad was last updated.',
      }),
  },
  WorkpadManager: {
    getModalTitle: () =>
      i18n.translate('xpack.canvas.workpadManager.modalTitle', {
        defaultMessage: '{CANVAS} workpads',
        values: {
          CANVAS,
        },
      }),
    getMyWorkpadsTabLabel: () =>
      i18n.translate('xpack.canvas.workpadManager.myWorkpadsTabLabel', {
        defaultMessage: 'My workpads',
      }),
    getWorkpadTemplatesTabLabel: () =>
      i18n.translate('xpack.canvas.workpadManager.workpadTemplatesTabLabel', {
        defaultMessage: 'Templates',
        description: 'The label for the tab that displays a list of designed workpad templates.',
      }),
  },
  WorkpadSearch: {
    getWorkpadSearchPlaceholder: () =>
      i18n.translate('xpack.canvas.workpadSearch.searchPlaceholder', {
        defaultMessage: 'Find workpad',
      }),
  },
  WorkpadTemplates: {
    getTableDescriptionColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadTemplates.table.descriptionColumnTitle', {
        defaultMessage: 'Description',
      }),
    getTableNameColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadTemplates.table.nameColumnTitle', {
        defaultMessage: 'Template name',
      }),
    getTableTagsColumnTitle: () =>
      i18n.translate('xpack.canvas.workpadTemplates.table.tagsColumnTitle', {
        defaultMessage: 'Tags',
        description:
          'This column contains relevant tags that indicate what type of template ' +
          'is displayed. For example: "report", "presentation", etc.',
      }),
    getTemplateSearchPlaceholder: () =>
      i18n.translate('xpack.canvas.workpadTemplate.searchPlaceholder', {
        defaultMessage: 'Find template',
      }),
    getCloneTemplateLinkAriaLabel: (templateName: string) =>
      i18n.translate('xpack.canvas.workpadTemplate.cloneTemplateLinkAriaLabel', {
        defaultMessage: `Clone workpad template '{templateName}'`,
        values: {
          templateName,
        },
      }),
  },
};
