/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { BOLD_MD_TOKEN, CANVAS, HTML, JSON, KIBANA, PDF, POST, URL, ZIP } from './constants';

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
  AdvancedFilter: {
    getApplyButtonLabel: () =>
      i18n.translate('xpack.canvas.renderer.advancedFilter.applyButtonLabel', {
        defaultMessage: 'Apply',
        description: 'This refers to applying the filter to the Canvas workpad',
      }),
    getInputPlaceholder: () =>
      i18n.translate('xpack.canvas.renderer.advancedFilter.inputPlaceholder', {
        defaultMessage: 'Enter filter expression',
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
        defaultMessage: 'Canvas failed to load',
      }),
    getLoadingMessage: () =>
      i18n.translate('xpack.canvas.app.loadingMessage', {
        defaultMessage: 'Canvas is loading',
      }),
  },
  ArgAddPopover: {
    getAddAriaLabel: () =>
      i18n.translate('xpack.canvas.argAddPopover.addAriaLabel', {
        defaultMessage: 'Add argument',
      }),
  },
  ArgFormAdvancedFailure: {
    getApplyButtonLabel: () =>
      i18n.translate('xpack.canvas.argFormAdvancedFailure.applyButtonLabel', {
        defaultMessage: 'Apply',
      }),
    getResetButtonLabel: () =>
      i18n.translate('xpack.canvas.argFormAdvancedFailure.resetButtonLabel', {
        defaultMessage: 'Reset',
      }),
    getRowErrorMessage: () =>
      i18n.translate('xpack.canvas.argFormAdvancedFailure.rowErrorMessage', {
        defaultMessage: 'Invalid Expression',
      }),
  },
  ArgFormArgSimpleForm: {
    getRemoveAriaLabel: () =>
      i18n.translate('xpack.canvas.argFormArgSimpleForm.removeAriaLabel', {
        defaultMessage: 'Remove',
      }),
    getRequiredTooltip: () =>
      i18n.translate('xpack.canvas.argFormArgSimpleForm.requiredTooltip', {
        defaultMessage: 'This argument is required, you should specify a value.',
      }),
  },
  ArgFormPendingArgValue: {
    getLoadingMessage: () =>
      i18n.translate('xpack.canvas.argFormPendingArgValue.loadingMessage', {
        defaultMessage: 'Loading',
      }),
  },
  ArgFormSimpleFailure: {
    getFailureTooltip: () =>
      i18n.translate('xpack.canvas.argFormSimpleFailure.failureTooltip', {
        defaultMessage:
          'The interface for this argument could not parse the value, so a fallback input is being used',
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
  CustomElementModal: {
    getCancelButtonLabel: () =>
      i18n.translate('xpack.canvas.customElementModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      }),
    getCharactersRemainingDescription: (numberOfRemainingCharacter: number) =>
      i18n.translate('xpack.canvas.customElementModal.remainingCharactersDescription', {
        defaultMessage: '{numberOfRemainingCharacter} characters remaining',
        values: {
          numberOfRemainingCharacter,
        },
      }),
    getDescriptionInputLabel: () =>
      i18n.translate('xpack.canvas.customElementModal.descriptionInputLabel', {
        defaultMessage: 'Description',
      }),
    getElementPreviewTitle: () =>
      i18n.translate('xpack.canvas.customElementModal.elementPreviewTitle', {
        defaultMessage: 'Element preview',
      }),
    getImageFilePickerPlaceholder: () =>
      i18n.translate('xpack.canvas.customElementModal.imageFilePickerPlaceholder', {
        defaultMessage: 'Select or drag and drop an image',
      }),
    getImageInputDescription: () =>
      i18n.translate('xpack.canvas.customElementModal.imageInputDescription', {
        defaultMessage:
          'Take a screenshot of your element and upload it here. This can also be done after saving.',
      }),
    getImageInputLabel: () =>
      i18n.translate('xpack.canvas.customElementModal.imageInputLabel', {
        defaultMessage: 'Thumbnail image',
      }),
    getNameInputLabel: () =>
      i18n.translate('xpack.canvas.customElementModal.nameInputLabel', {
        defaultMessage: 'Name',
      }),
    getSaveButtonLabel: () =>
      i18n.translate('xpack.canvas.customElementModal.saveButtonLabel', {
        defaultMessage: 'Save',
      }),
  },
  DatasourceDatasourceComponent: {
    getChangeButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.changeButtonLabel', {
        defaultMessage: 'Change element data source',
      }),
    getPreviewButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.previewButtonLabel', {
        defaultMessage: 'Preview data',
      }),
    getSaveButtonLabel: () =>
      i18n.translate('xpack.canvas.datasourceDatasourceComponent.saveButtonLabel', {
        defaultMessage: 'Save',
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
  DropdownFilter: {
    getMatchAllOptionLabel: () =>
      i18n.translate('xpack.canvas.renderer.dropdownFilter.matchAllOptionLabel', {
        defaultMessage: 'ANY',
        description: 'The dropdown filter option to match any value in the field.',
      }),
  },
  ElementConfig: {
    getFailedLabel: () =>
      i18n.translate('xpack.canvas.elementConfig.failedLabel', {
        defaultMessage: 'Failed',
        description:
          'The label for the total number of elements in a workpad that have thrown an error or failed to load',
      }),
    getLoadedLabel: () =>
      i18n.translate('xpack.canvas.elementConfig.loadedLabel', {
        defaultMessage: 'Loaded',
        description: 'The label for the number of elements in a workpad that have loaded',
      }),
    getProgressLabel: () =>
      i18n.translate('xpack.canvas.elementConfig.progressLabel', {
        defaultMessage: 'Progress',
        description: 'The label for the percentage of elements that have finished loading',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.elementConfig.title', {
        defaultMessage: 'Element status',
        description:
          '"Elements" refers to the individual text, images, or visualizations that you can add to a Canvas workpad',
      }),
    getTotalLabel: () =>
      i18n.translate('xpack.canvas.elementConfig.totalLabel', {
        defaultMessage: 'Total',
        description: 'The label for the total number of elements in a workpad',
      }),
  },
  ElementControls: {
    getEditTooltip: () =>
      i18n.translate('xpack.canvas.elementControls.editToolTip', {
        defaultMessage: 'Edit',
      }),
    getEditAriaLabel: () =>
      i18n.translate('xpack.canvas.elementControls.editAriaLabel', {
        defaultMessage: 'Edit element',
      }),
    getDeleteTooltip: () =>
      i18n.translate('xpack.canvas.elementControls.deleteToolTip', {
        defaultMessage: 'Delete',
      }),
    getDeleteAriaLabel: () =>
      i18n.translate('xpack.canvas.elementControls.deleteAriaLabel', {
        defaultMessage: 'Delete element',
      }),
  },
  ElementSettings: {
    getDataTabLabel: () =>
      i18n.translate('xpack.canvas.elementSettings.dataTabLabel', {
        defaultMessage: 'Data',
        description:
          'This tab contains the settings for the data (i.e. Elasticsearch query) used as ' +
          'the source for a Canvas element',
      }),
    getDisplayTabLabel: () =>
      i18n.translate('xpack.canvas.elementSettings.displayTabLabel', {
        defaultMessage: 'Display',
        description: 'This tab contains the settings for how data is displayed in a Canvas element',
      }),
  },
  ElementTypes: {
    getEditElementTitle: () =>
      i18n.translate('xpack.canvas.elementTypes.editElementTitle', {
        defaultMessage: 'Edit element',
      }),
    getDeleteElementTitle: (elementName: string) =>
      i18n.translate('xpack.canvas.elementTypes.deleteElementTitle', {
        defaultMessage: `Delete element '{elementName}'?`,
        values: {
          elementName,
        },
      }),
    getDeleteElementDescription: () =>
      i18n.translate('xpack.canvas.elementTypes.deleteElementDescription', {
        defaultMessage: 'Are you sure you want to delete this element?',
      }),
    getCancelButtonLabel: () =>
      i18n.translate('xpack.canvas.elementTypes.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      }),
    getDeleteButtonLabel: () =>
      i18n.translate('xpack.canvas.elementTypes.deleteButtonLabel', {
        defaultMessage: 'Delete',
      }),
    getAddNewElementTitle: () =>
      i18n.translate('xpack.canvas.elementTypes.addNewElementTitle', {
        defaultMessage: 'Add new elements',
      }),
    getAddNewElementDescription: () =>
      i18n.translate('xpack.canvas.elementTypes.addNewElementDescription', {
        defaultMessage: 'Group and save workpad elements to create new elements',
      }),
    getFindElementPlaceholder: () =>
      i18n.translate('xpack.canvas.elementTypes.findElementPlaceholder', {
        defaultMessage: 'Find element',
      }),
    getElementsTitle: () =>
      i18n.translate('xpack.canvas.elementTypes.elementsTitle', {
        defaultMessage: 'Elements',
        description: 'Title for the "Elements" tab when adding a new element',
      }),
    getMyElementsTitle: () =>
      i18n.translate('xpack.canvas.elementTypes.myElementsTitle', {
        defaultMessage: 'My elements',
        description: 'Title for the "My elements" tab when adding a new element',
      }),
  },
  Error: {
    getDescription: () =>
      i18n.translate('xpack.canvas.errorComponent.description', {
        defaultMessage: 'Expression failed with the message:',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.errorComponent.title', {
        defaultMessage: 'Whoops! Expression failed',
      }),
  },
  Expression: {
    getCancelButtonLabel: () =>
      i18n.translate('xpack.canvas.expression.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      }),
    getCloseButtonLabel: () =>
      i18n.translate('xpack.canvas.expression.closeButtonLabel', {
        defaultMessage: 'Close',
      }),
    getLearnLinkText: () =>
      i18n.translate('xpack.canvas.expression.learnLinkText', {
        defaultMessage: 'Learn expression syntax',
      }),
    getMaximizeButtonLabel: () =>
      i18n.translate('xpack.canvas.expression.maximizeButtonLabel', {
        defaultMessage: 'Maximize editor',
      }),
    getMinimizeButtonLabel: () =>
      i18n.translate('xpack.canvas.expression.minimizeButtonLabel', {
        defaultMessage: 'Minimize Editor',
      }),
    getRunButtonLabel: () =>
      i18n.translate('xpack.canvas.expression.runButtonLabel', {
        defaultMessage: 'Run',
      }),
    getRunTooltip: () =>
      i18n.translate('xpack.canvas.expression.runTooltip', {
        defaultMessage: 'Run the expression',
      }),
  },
  ExpressionElementNotSelected: {
    getCloseButtonLabel: () =>
      i18n.translate('xpack.canvas.expressionElementNotSelected.closeButtonLabel', {
        defaultMessage: 'Close',
      }),
    getSelectDescription: () =>
      i18n.translate('xpack.canvas.expressionElementNotSelected.selectDescription', {
        defaultMessage: 'Select an element to show expression input',
      }),
  },
  ExpressionInput: {
    getArgReferenceAliasesDetail: (aliases: string) =>
      i18n.translate('xpack.canvas.expressionInput.argReferenceAliasesDetail', {
        defaultMessage: '{BOLD_MD_TOKEN}Aliases{BOLD_MD_TOKEN}: {aliases}',
        values: {
          BOLD_MD_TOKEN,
          aliases,
        },
      }),
    getArgReferenceDefaultDetail: (defaultVal: string) =>
      i18n.translate('xpack.canvas.expressionInput.argReferenceDefaultDetail', {
        defaultMessage: '{BOLD_MD_TOKEN}Default{BOLD_MD_TOKEN}: {defaultVal}',
        values: {
          BOLD_MD_TOKEN,
          defaultVal,
        },
      }),
    getArgReferenceRequiredDetail: (required: string) =>
      i18n.translate('xpack.canvas.expressionInput.argReferenceRequiredDetail', {
        defaultMessage: '{BOLD_MD_TOKEN}Required{BOLD_MD_TOKEN}: {required}',
        values: {
          BOLD_MD_TOKEN,
          required,
        },
      }),
    getArgReferenceTypesDetail: (types: string) =>
      i18n.translate('xpack.canvas.expressionInput.argReferenceTypesDetail', {
        defaultMessage: '{BOLD_MD_TOKEN}Types{BOLD_MD_TOKEN}: {types}',
        values: {
          BOLD_MD_TOKEN,
          types,
        },
      }),
    getFunctionReferenceAcceptsDetail: (acceptTypes: string) =>
      i18n.translate('xpack.canvas.expressionInput.functionReferenceAccepts', {
        defaultMessage: '{BOLD_MD_TOKEN}Accepts{BOLD_MD_TOKEN}: {acceptTypes}',
        values: {
          BOLD_MD_TOKEN,
          acceptTypes,
        },
      }),
    getFunctionReferenceReturnsDetail: (returnType: string) =>
      i18n.translate('xpack.canvas.expressionInput.functionReferenceReturns', {
        defaultMessage: '{BOLD_MD_TOKEN}Returns{BOLD_MD_TOKEN}: {returnType}',
        values: {
          BOLD_MD_TOKEN,
          returnType,
        },
      }),
  },
  FunctionFormContextError: {
    getContextErrorMessage: (errorMessage: string) =>
      i18n.translate('xpack.canvas.functionForm.contextError', {
        defaultMessage: 'ERROR: {errorMessage}',
        values: {
          errorMessage,
        },
      }),
  },
  FunctionFormFunctionUnknown: {
    getUnknownArgumentTypeErrorMessage: (expressionType: string) =>
      i18n.translate('xpack.canvas.functionForm.functionUnknown.unknownArgumentTypeError', {
        defaultMessage: 'Unknown expression type "{expressionType}"',
        values: {
          expressionType,
        },
      }),
  },
  GroupSettings: {
    getSaveGroupDescription: () =>
      i18n.translate('xpack.canvas.groupSettings.saveGroupDescription', {
        defaultMessage: 'Save this group as a new element to re-use it throughout your workpad.',
      }),
    getUngroupDescription: () =>
      i18n.translate('xpack.canvas.groupSettings.ungroupDescription', {
        defaultMessage: 'Ungroup ({uKey}) to edit individual element settings.',
        values: {
          uKey: 'U',
        },
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
        defaultMessage: 'Keyboard shortcuts',
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
        defaultMessage: 'Keyboard shortcuts',
      }),
  },
  Link: {
    getErrorMessage: (message: string) =>
      i18n.translate('xpack.canvas.link.errorMessage', {
        defaultMessage: 'LINK ERROR: {message}',
        values: {
          message,
        },
      }),
  },
  MultiElementSettings: {
    getMultipleElementsActionsDescription: () =>
      i18n.translate('xpack.canvas.groupSettings.multipleElementsActionsDescription', {
        defaultMessage:
          'Deselect these elements to edit their individual settings, press ({gKey}) to group them, or save this selection as a new ' +
          'element to re-use it throughout your workpad.',
        values: {
          gKey: 'G',
        },
      }),
    getMultipleElementsDescription: () =>
      i18n.translate('xpack.canvas.groupSettings.multipleElementsDescription', {
        defaultMessage: 'Multiple elements are currently selected.',
      }),
  },
  PageConfig: {
    getBackgroundColorDescription: () =>
      i18n.translate('xpack.canvas.pageConfig.backgroundColorDescription', {
        defaultMessage: 'Accepts HEX, RGB or HTML color names',
      }),
    getBackgroundColorLabel: () =>
      i18n.translate('xpack.canvas.pageConfig.backgroundColorLabel', {
        defaultMessage: 'Background',
      }),
    getNoTransitionDropDownOptionLabel: () =>
      i18n.translate('xpack.canvas.pageConfig.transitions.noneDropDownOptionLabel', {
        defaultMessage: 'None',
        description:
          'This is the option the user should choose if they do not want any page transition (i.e. fade in, fade out, etc) to ' +
          'be applied to the current page.',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.pageConfig.title', {
        defaultMessage: 'Page styles',
      }),
    getTransitionLabel: () =>
      i18n.translate('xpack.canvas.pageConfig.transitionLabel', {
        defaultMessage: 'Transition',
        description:
          'This refers to the transition effect, such as fade in or rotate,  applied to a page in presentation mode.',
      }),
    getTransitionPreviewLabel: () =>
      i18n.translate('xpack.canvas.pageConfig.transitionPreviewLabel', {
        defaultMessage: 'Preview',
        description: 'This is the label for a preview of the transition effect selected.',
      }),
  },
  PageManager: {
    getPageNumberAriaLabel: (pageNumber: number) =>
      i18n.translate('xpack.canvas.pageManager.pageNumberAriaLabel', {
        defaultMessage: 'Load page number {pageNumber}',
        values: {
          pageNumber,
        },
      }),
  },
  PagePreviewPageControls: {
    getClonePageAriaLabel: () =>
      i18n.translate('xpack.canvas.pagePreviewPageControls.clonePageAriaLabel', {
        defaultMessage: 'Clone page',
      }),
    getClonePageTooltip: () =>
      i18n.translate('xpack.canvas.pagePreviewPageControls.clonePageTooltip', {
        defaultMessage: 'Clone',
      }),
    getDeletePageAriaLabel: () =>
      i18n.translate('xpack.canvas.pagePreviewPageControls.deletePageAriaLabel', {
        defaultMessage: 'Delete page',
      }),
    getDeletePageTooltip: () =>
      i18n.translate('xpack.canvas.pagePreviewPageControls.deletePageTooltip', {
        defaultMessage: 'Delete',
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
    getUnsupportedRendererWarning: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.unsupportedRendererWarning', {
        defaultMessage:
          'This workpad contains render functions that are not supported by the {CANVAS} Shareable Workpad Runtime. These elements will not be rendered:',
        values: {
          CANVAS,
        },
      }),
    getWorkpadStepTitle: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.downloadWorkpadTitle', {
        defaultMessage: 'Download workpad',
      }),
  },
  ShareWebsiteRuntimeStep: {
    getDownloadLabel: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.downloadLabel', {
        defaultMessage: 'Download runtime',
      }),
    getStepDescription: () =>
      i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.description', {
        defaultMessage:
          'In order to render a Shareable Workpad, you also need to include the {CANVAS} Shareable Workpad Runtime. You can skip this step if the runtime is already included on your website.',
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
          'There are a number of inline parameters to configure the Shareable Workpad.',
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
        defaultMessage: 'Download workpad',
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
  SidebarContent: {
    getGroupedElementSidebarTitle: () =>
      i18n.translate('xpack.canvas.sidebarContent.groupedElementSidebarTitle', {
        defaultMessage: 'Grouped element',
        description:
          'The title displayed when a grouped element is selected. "elements" refer to the different visualizations, images, ' +
          'text, etc that can be added in a Canvas workpad. These elements can be grouped into a larger "grouped element" ' +
          'that contains multiple individual elements.',
      }),
    getMultiElementSidebarTitle: () =>
      i18n.translate('xpack.canvas.sidebarContent.multiElementSidebarTitle', {
        defaultMessage: 'Multiple elements',
        description:
          'The title displayed when multiple elements are selected. "elements" refer to the different visualizations, images, ' +
          'text, etc that can be added in a Canvas workpad.',
      }),
    getSingleElementSidebarTitle: () =>
      i18n.translate('xpack.canvas.sidebarContent.singleElementSidebarTitle', {
        defaultMessage: 'Selected element',
        description:
          'The title displayed when a single element are selected. "element" refer to the different visualizations, images, ' +
          'text, etc that can be added in a Canvas workpad.',
      }),
  },
  SidebarHeader: {
    getAlignmentMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.alignmentMenuItemLabel', {
        defaultMessage: 'Alignment',
        description:
          'This refers to the vertical (i.e. left, center, right) and horizontal (i.e. top, middle, bottom) ' +
          'alignment options of the selected elements',
      }),
    getBottomAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.bottomAlignMenuItemLabel', {
        defaultMessage: 'Bottom',
      }),
    getBringForwardAriaLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.bringForwardArialLabel', {
        defaultMessage: 'Move element up one layer',
      }),
    getBringToFrontAriaLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.bringToFrontArialLabel', {
        defaultMessage: 'Move element to top layer',
      }),
    getCenterAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.centerAlignMenuItemLabel', {
        defaultMessage: 'Center',
        description: 'This refers to alignment centered horizontally.',
      }),
    getContextMenuTitle: () =>
      i18n.translate('xpack.canvas.sidebarHeader.contextMenuAriaLabel', {
        defaultMessage: 'Element options',
      }),
    getCreateElementModalTitle: () =>
      i18n.translate('xpack.canvas.sidebarHeader.createElementModalTitle', {
        defaultMessage: 'Create new element',
      }),
    getDistributionMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.distributionMenutItemLabel', {
        defaultMessage: 'Distribution',
        description:
          'This refers to the options to evenly spacing the selected elements horizontall or vertically.',
      }),
    getGroupMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.groupMenuItemLabel', {
        defaultMessage: 'Group',
        description: 'This refers to grouping multiple selected elements.',
      }),
    getHorizontalDistributionMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.horizontalDistributionMenutItemLabel', {
        defaultMessage: 'Horizontal',
      }),
    getLeftAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.leftAlignMenuItemLabel', {
        defaultMessage: 'Left',
      }),
    getMiddleAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.middleAlignMenuItemLabel', {
        defaultMessage: 'Middle',
        description: 'This refers to alignment centered vertically.',
      }),
    getOrderMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.orderMenuItemLabel', {
        defaultMessage: 'Order',
        description: 'Refers to the order of the elements displayed on the page from front to back',
      }),
    getRightAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.rightAlignMenuItemLabel', {
        defaultMessage: 'Right',
      }),
    getSaveElementMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.savedElementMenuItemLabel', {
        defaultMessage: 'Save as new element',
      }),
    getSendBackwardAriaLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.sendBackwardArialLabel', {
        defaultMessage: 'Move element down one layer',
      }),
    getSendToBackAriaLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.sendToBackArialLabel', {
        defaultMessage: 'Move element to bottom layer',
      }),
    getTopAlignMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.topAlignMenuItemLabel', {
        defaultMessage: 'Top',
      }),
    getUngroupMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.ungroupMenuItemLabel', {
        defaultMessage: 'Ungroup',
        description: 'This refers to ungrouping a grouped element',
      }),
    getVerticalDistributionMenuItemLabel: () =>
      i18n.translate('xpack.canvas.sidebarHeader.verticalDistributionMenutItemLabel', {
        defaultMessage: 'Vertical',
      }),
  },
  TextStylePicker: {
    getAlignCenterOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.alignCenterOption', {
        defaultMessage: 'Align center',
      }),
    getAlignLeftOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.alignLeftOption', {
        defaultMessage: 'Align left',
      }),
    getAlignRightOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.alignRightOption', {
        defaultMessage: 'Align right',
      }),
    getStyleBoldOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.styleBoldOption', {
        defaultMessage: 'Bold',
      }),
    getStyleItalicOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.styleItalicOption', {
        defaultMessage: 'Italic',
      }),
    getStyleUnderlineOption: () =>
      i18n.translate('xpack.canvas.textStylePicker.styleUnderlineOption', {
        defaultMessage: 'Underline',
      }),
  },
  TimePicker: {
    getApplyButtonLabel: () =>
      i18n.translate('xpack.canvas.timePicker.applyButtonLabel', {
        defaultMessage: 'Apply',
      }),
  },
  Toolbar: {
    getEditorButtonLabel: () =>
      i18n.translate('xpack.canvas.toolbar.editorButtonLabel', {
        defaultMessage: 'Expression editor',
      }),
    getNextPageAriaLabel: () =>
      i18n.translate('xpack.canvas.toolbar.nextPageAriaLabel', {
        defaultMessage: 'Next Page',
      }),
    getPageButtonLabel: (pageNum: number, totalPages: number) =>
      i18n.translate('xpack.canvas.toolbar.pageButtonLabel', {
        defaultMessage: 'Page {pageNum}{rest}',
        values: {
          pageNum,
          rest: totalPages > 1 ? ` of ${totalPages}` : '',
        },
      }),
    getPreviousPageAriaLabel: () =>
      i18n.translate('xpack.canvas.toolbar.previousPageAriaLabel', {
        defaultMessage: 'Previous Page',
      }),
    getWorkpadManagerCloseButtonLabel: () =>
      i18n.translate('xpack.canvas.toolbar.workpadManagerCloseButtonLabel', {
        defaultMessage: 'Close',
      }),
  },
  ToolbarTray: {
    getCloseTrayAriaLabel: () =>
      i18n.translate('xpack.canvas.toolbarTray.closeTrayAriaLabel', {
        defaultMessage: 'Close tray',
      }),
  },
  WorkpadConfig: {
    getApplyStylesheetButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.applyStylesheetButtonLabel', {
        defaultMessage: `Apply stylesheet`,
        description:
          '"stylesheet" refers to the collection of CSS style rules entered by the user.',
      }),
    getFlipDimensionAriaLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.swapDimensionsAriaLabel', {
        defaultMessage: `Swap the page's width and height`,
      }),
    getFlipDimensionTooltip: () =>
      i18n.translate('xpack.canvas.workpadConfig.swapDimensionsTooltip', {
        defaultMessage: 'Swap the width and height',
      }),
    getGlobalCSSLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.globalCSSLabel', {
        defaultMessage: `Global CSS overrides`,
      }),
    getGlobalCSSTooltip: () =>
      i18n.translate('xpack.canvas.workpadConfig.globalCSSTooltip', {
        defaultMessage: `Apply styles to all pages in this workpad`,
      }),
    getNameLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.nameLabel', {
        defaultMessage: 'Name',
      }),
    getPageHeightLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.heightLabel', {
        defaultMessage: 'Height',
      }),
    getPageSizeBadgeAriaLabel: (sizeName: string) =>
      i18n.translate('xpack.canvas.workpadConfig.pageSizeBadgeAriaLabel', {
        defaultMessage: `Preset page size: {sizeName}`,
        values: {
          sizeName,
        },
      }),
    getPageSizeBadgeOnClickAriaLabel: (sizeName: string) =>
      i18n.translate('xpack.canvas.workpadConfig.pageSizeBadgeOnClickAriaLabel', {
        defaultMessage: `Set page size to {sizeName}`,
        values: {
          sizeName,
        },
      }),
    getPageWidthLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.widthLabel', {
        defaultMessage: 'Width',
      }),
    getTitle: () =>
      i18n.translate('xpack.canvas.workpadConfig.title', {
        defaultMessage: 'Workpad settings',
      }),
    getUSLetterButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadConfig.USLetterButtonLabel', {
        defaultMessage: 'US Letter',
        description: 'This is referring to the dimentions of U.S. standard letter paper.',
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
    getCopyShareConfigMessage: () =>
      i18n.translate('xpack.canvas.workpadHeaderWorkpadExport.copyShareConfigMessage', {
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
    getDeleteModalConfirmButtonLabel: () =>
      i18n.translate('xpack.canvas.workpadLoader.deleteModalConfirmButtonLabel', {
        defaultMessage: 'Delete',
      }),
    getDeleteModalDescription: () =>
      i18n.translate('xpack.canvas.workpadLoader.deleteModalDescription', {
        defaultMessage: `You can't recover deleted workpads.`,
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
    getEmptyPromptTitle: () =>
      i18n.translate('xpack.canvas.workpadLoader.emptyPromptTitle', {
        defaultMessage: 'Add your first workpad',
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
    getCloneTemplateLinkAriaLabel: (templateName: string) =>
      i18n.translate('xpack.canvas.workpadTemplate.cloneTemplateLinkAriaLabel', {
        defaultMessage: `Clone workpad template '{templateName}'`,
        values: {
          templateName,
        },
      }),
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
  },
};
