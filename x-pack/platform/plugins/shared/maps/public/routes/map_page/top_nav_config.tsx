/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Adapters } from '@kbn/inspector-plugin/public';
import {
  SavedObjectSaveModalOrigin,
  OnSaveProps,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { ScopedHistory } from '@kbn/core/public';
import {
  getNavigateToApp,
  getMapsCapabilities,
  getInspector,
  getCoreOverlays,
  getSavedObjectsTagging,
} from '../../kibana_services';
import { MAP_EMBEDDABLE_NAME } from '../../../common/constants';
import { SavedMap } from './saved_map';
import { checkForDuplicateTitle } from '../../content_management';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export function getTopNavConfig({
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
}) {
  const topNavConfigs = [];

  topNavConfigs.push(
    {
      id: 'mapSettings',
      label: i18n.translate('xpack.maps.topNav.openSettingsButtonLabel', {
        defaultMessage: `Settings`,
      }),
      description: i18n.translate('xpack.maps.topNav.openSettingsDescription', {
        defaultMessage: `Open map settings`,
      }),
      testId: 'openSettingsButton',
      disableButton() {
        return isOpenSettingsDisabled;
      },
      run() {
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
      testId: 'openInspectorButton',
      run() {
        getInspector().open(inspectorAdapters, {});
      },
    },
    {
      id: 'full-screen',
      label: i18n.translate('xpack.maps.topNav.fullScreenButtonLabel', {
        defaultMessage: `full screen`,
      }),
      description: i18n.translate('xpack.maps.topNav.fullScreenDescription', {
        defaultMessage: `full screen`,
      }),
      testId: 'mapsFullScreenMode',
      run() {
        enableFullScreen();
      },
    }
  );

  if (savedMap.hasOriginatingApp()) {
    topNavConfigs.push({
      label: i18n.translate('xpack.maps.topNav.cancel', {
        defaultMessage: 'Cancel',
      }),
      run: () => {
        getNavigateToApp()(savedMap.getOriginatingApp()!, {
          path: savedMap.getOriginatingPath(),
        });
      },
      testId: 'mapsCancelButton',
      description: i18n.translate('xpack.maps.topNav.cancelButtonAriaLabel', {
        defaultMessage: 'Return to the last app without saving changes',
      }),
    });
  }

  if (getMapsCapabilities().save) {
    const hasSaveAndReturnConfig = savedMap.hasSaveAndReturnConfig();
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

    topNavConfigs.push({
      id: 'save',
      iconType: hasSaveAndReturnConfig ? undefined : 'save',
      label: hasSaveAndReturnConfig
        ? saveAndReturnButtonLabel
        : i18n.translate('xpack.maps.topNav.saveMapButtonLabel', {
            defaultMessage: `save`,
          }),
      description: i18n.translate('xpack.maps.topNav.saveMapDescription', {
        defaultMessage: `Save map`,
      }),
      emphasize: !hasSaveAndReturnConfig,
      testId: 'mapSaveButton',
      disableButton() {
        return isSaveDisabled;
      },
      tooltip() {
        if (isSaveDisabled) {
          return i18n.translate('xpack.maps.topNav.saveMapDisabledButtonTooltip', {
            defaultMessage: 'Confirm or Cancel your layer changes before saving',
          });
        }
      },
      run: () => {
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
          onSave: async (
            props: OnSaveProps & {
              dashboardId?: string | null;
              addToLibrary: boolean;
            }
          ) => {
            try {
              await checkForDuplicateTitle(
                {
                  id: props.newCopyOnSave ? undefined : savedMap.getSavedObjectId(),
                  title: props.newTitle,
                  copyOnSave: props.newCopyOnSave,
                  lastSavedTitle: savedMap.getSavedObjectId() ? savedMap.getTitle() : '',
                  isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
                  getDisplayName: () => MAP_EMBEDDABLE_NAME,
                  onTitleDuplicate: props.onTitleDuplicate,
                },
                {
                  overlays: getCoreOverlays(),
                }
              );
            } catch (e) {
              // ignore duplicate title failure, user notified in save modal
              return {};
            }

            await savedMap.save({
              ...props,
              tags,
              saveByReference: props.addToLibrary,
              history,
            });
            // showSaveModal wrapper requires onSave to return an object with an id to close the modal after successful save
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

        let saveModal;

        if (savedMap.hasOriginatingApp()) {
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
              canSaveByReference={true} // we know here that we have save capabilities.
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
      },
    });

    if (hasSaveAndReturnConfig) {
      topNavConfigs.push({
        id: 'saveAndReturn',
        label: i18n.translate('xpack.maps.topNav.saveAndReturnButtonLabel', {
          defaultMessage: 'Save and return',
        }),
        emphasize: true,
        iconType: 'checkInCircleFilled',
        run: () => {
          savedMap.save({
            newTitle: savedMap.getTitle(),
            newDescription: mapDescription,
            newCopyOnSave: false,
            isTitleDuplicateConfirmed: false,
            returnToOrigin: true,
            onTitleDuplicate: () => {},
            saveByReference: !savedMap.isByValue(),
            history,
          });
        },
        testId: 'mapSaveAndReturnButton',
      });
    }
  }

  return topNavConfigs;
}
