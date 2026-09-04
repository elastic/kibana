/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AppHeaderBack, AppHeaderMenu } from '@kbn/app-header';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type {
  OnSaveProps,
  SaveResult,
  ShowSaveModalMinimalSaveModalProps,
} from '@kbn/saved-objects-plugin/public';
import { SavedObjectSaveModalOrigin, showSaveModal } from '@kbn/saved-objects-plugin/public';
import { SavedObjectSaveModalDashboard } from '@kbn/presentation-util-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
import { APP_ID, APP_NAME } from '../../../common/constants';
import {
  getCore,
  getCoreOverlays,
  getInspector,
  getMapsCapabilities,
  getNavigateToApp,
  getSavedObjectsTagging,
} from '../../kibana_services';
import type { SavedMap } from './saved_map';
import { hasLibraryItemWithTitle } from '../../content_management';
import { unsavedChangesTitle, unsavedChangesWarning } from './saved_map';

export function getMapsAppHeaderBack({
  savedMap,
  history,
  hasSavedMaps,
}: {
  savedMap: SavedMap;
  history: ScopedHistory;
  hasSavedMaps: boolean;
}): AppHeaderBack | undefined {
  if (savedMap.hasSaveAndReturnConfig()) {
    const originatingApp = savedMap.getOriginatingApp()!;
    return {
      href: getCore().application.getUrlForApp(originatingApp, {
        path: savedMap.getOriginatingPath(),
      }),
      label: savedMap.getOriginatingAppName() ?? originatingApp,
      onClick: (event) => {
        event.preventDefault();
        getNavigateToApp()(originatingApp, {
          path: savedMap.getOriginatingPath(),
        });
      },
    };
  }

  // Listing redirects to create when the library is empty, so a listing back
  // target would loop. Hide it until there is a list to return to.
  if (!hasSavedMaps && !savedMap.getSavedObjectId()) {
    return undefined;
  }

  return {
    href: getCore().application.getUrlForApp(APP_ID),
    label: APP_NAME,
    onClick: async (event) => {
      event.preventDefault();
      if (savedMap.hasUnsavedChanges()) {
        const confirmed = await getCoreOverlays().openConfirm(unsavedChangesWarning, {
          title: unsavedChangesTitle,
          'data-test-subj': 'appLeaveConfirmModal',
        });
        if (!confirmed) {
          return;
        }
      }
      history.push('/');
    },
  };
}

export function getMapsAppHeaderMenu({
  savedMap,
  isOpenSettingsDisabled,
  isSaveDisabled,
  enableFullScreen,
  openMapSettings,
  inspectorAdapters,
  history,
}: {
  savedMap: SavedMap;
  isOpenSettingsDisabled: boolean;
  isSaveDisabled: boolean;
  enableFullScreen: () => void;
  openMapSettings: () => void;
  inspectorAdapters: Adapters;
  history: ScopedHistory;
}): AppHeaderMenu | undefined {
  const items: NonNullable<AppHeaderMenu['items']> = [
    {
      id: 'mapSettings',
      label: i18n.translate('xpack.maps.topNav.openSettingsButtonLabel', {
        defaultMessage: `Settings`,
      }),
      description: i18n.translate('xpack.maps.topNav.openSettingsDescription', {
        defaultMessage: `Open map settings`,
      }),
      iconType: 'gear',
      testId: 'openSettingsButton',
      disableButton: isOpenSettingsDisabled,
      run: () => {
        openMapSettings();
      },
    },
    {
      id: 'inspect',
      label: i18n.translate('xpack.maps.topNav.openInspectorButtonLabel', {
        defaultMessage: `inspect`,
      }),
      description: i18n.translate('xpack.maps.topNav.openInspectorDescription', {
        defaultMessage: `Open Inspector`,
      }),
      iconType: 'inspect',
      testId: 'openInspectorButton',
      run: () => {
        getInspector().open(inspectorAdapters, {});
      },
    },
    {
      id: 'full-screen',
      label: i18n.translate('xpack.maps.topNav.fullScreenButtonLabel', {
        defaultMessage: `full screen`,
      }),
      iconType: 'fullScreen',
      testId: 'mapsFullScreenMode',
      run: () => {
        enableFullScreen();
      },
    },
  ];

  const hasSaveAndReturnConfig = savedMap.hasSaveAndReturnConfig();

  if (hasSaveAndReturnConfig) {
    items.push({
      id: 'cancel',
      label: i18n.translate('xpack.maps.topNav.cancel', {
        defaultMessage: 'Cancel',
      }),
      description: i18n.translate('xpack.maps.topNav.cancelButtonAriaLabel', {
        defaultMessage: 'Return to the last app without saving changes',
      }),
      iconType: 'cross',
      testId: 'mapsCancelButton',
      run: () => {
        getNavigateToApp()(savedMap.getOriginatingApp()!, {
          path: savedMap.getOriginatingPath(),
        });
      },
    });
  }

  if (!getMapsCapabilities().save) {
    return { items };
  }

  const mapDescription = savedMap.getAttributes().description
    ? savedMap.getAttributes().description!
    : '';
  const saveAndReturnButtonLabel = savedMap.isByValue()
    ? i18n.translate('xpack.maps.topNav.saveToMapsButtonLabel', {
        defaultMessage: 'Save to maps',
      })
    : i18n.translate('xpack.maps.topNav.saveAsButtonLabel', {
        defaultMessage: 'Save as',
      });

  const openSaveModal = () => {
    let tags = savedMap.getTags();
    function onTagsSelected(nextTags: string[]) {
      tags = nextTags;
    }

    const savedObjectsTagging = getSavedObjectsTagging();
    const tagSelector = savedObjectsTagging ? (
      <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
        initialSelection={tags}
        onTagsSelected={onTagsSelected}
        markOptional
      />
    ) : undefined;

    const saveModalProps = {
      lastSavedTitle: savedMap.getSavedObjectId() ? savedMap.getTitle() : '',
      hasLibraryItemWithTitle,
      onSave: async (
        props: OnSaveProps & {
          dashboardId?: string | null;
          addToLibrary: boolean;
        }
      ): Promise<SaveResult> => {
        await savedMap.save({
          ...props,
          tags,
          saveByReference: props.addToLibrary,
          history,
        });
        return { id: 'id' };
      },
      onClose: () => {},
      documentInfo: {
        description: mapDescription,
        id: savedMap.getSavedObjectId(),
        title: savedMap.getTitle(),
      },
      objectType: i18n.translate('xpack.maps.topNav.saveModalType', {
        defaultMessage: 'map',
      }),
    };

    let saveModal: React.ReactElement<ShowSaveModalMinimalSaveModalProps>;

    if (hasSaveAndReturnConfig) {
      saveModal = (
        <SavedObjectSaveModalOrigin
          {...saveModalProps}
          onSave={async (props: OnSaveProps) => {
            return saveModalProps.onSave({ ...props, addToLibrary: true });
          }}
          originatingApp={savedMap.getOriginatingApp()}
          getAppNameFromId={savedMap.getAppNameFromId}
          returnToOriginSwitchLabel={
            savedMap.isByValue()
              ? i18n.translate('xpack.maps.topNav.updatePanel', {
                  defaultMessage: 'Update panel on {originatingAppName}',
                  values: { originatingAppName: savedMap.getOriginatingAppName() },
                })
              : undefined
          }
          options={tagSelector}
        />
      );
    } else {
      saveModal = (
        <SavedObjectSaveModalDashboard
          {...saveModalProps}
          canSaveByReference={true}
          mustCopyOnSaveMessage={
            savedMap.isManaged()
              ? i18n.translate('xpack.maps.topNav.mustCopyOnSaveMessage', {
                  defaultMessage: 'Elastic manages this map. Save any changes to a new map.',
                })
              : undefined
          }
          tagOptions={tagSelector}
        />
      );
    }

    showSaveModal(saveModal);
  };

  const saveItem = {
    id: 'save',
    iconType: 'save' as const,
    label: hasSaveAndReturnConfig
      ? saveAndReturnButtonLabel
      : i18n.translate('xpack.maps.topNav.saveMapButtonLabel', {
          defaultMessage: `save`,
        }),
    description: i18n.translate('xpack.maps.topNav.saveMapDescription', {
      defaultMessage: `Save map`,
    }),
    testId: 'mapSaveButton',
    disableButton: isSaveDisabled,
    tooltipContent: isSaveDisabled
      ? i18n.translate('xpack.maps.topNav.saveMapDisabledButtonTooltip', {
          defaultMessage: 'Confirm or Cancel your layer changes before saving',
        })
      : undefined,
    run: openSaveModal,
  };

  if (hasSaveAndReturnConfig) {
    items.push(saveItem);
    return {
      items,
      primaryActionItem: {
        id: 'saveAndReturn',
        label: i18n.translate('xpack.maps.topNav.saveAndReturnButtonLabel', {
          defaultMessage: 'Save and return',
        }),
        iconType: 'checkCircleFill',
        testId: 'mapSaveAndReturnButton',
        run: () => {
          savedMap.save({
            newTitle: savedMap.getTitle(),
            newDescription: mapDescription,
            newCopyOnSave: false,
            returnToOrigin: true,
            saveByReference: !savedMap.isByValue(),
            history,
          });
        },
      },
    };
  }

  return {
    items,
    primaryActionItem: saveItem,
  };
}
