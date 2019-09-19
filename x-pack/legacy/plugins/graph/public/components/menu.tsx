/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { TopNavMenu, TopNavMenuData } from '../../../../../../src/legacy/core_plugins/kibana_react/public';
import { CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';

export function MenuComponent(props: {
  toasts: CoreStart['notifications']['toasts'];
  uiSettings: CoreStart['uiSettings'];
  savedObjectsClient: CoreStart['savedObjects']['client'];
}) {
    // TODO move entries into individual functions
    const menuEntries: TopNavMenuData[] = [
  {
    label: i18n.translate('xpack.graph.topNavMenu.newWorkspaceLabel', {
      defaultMessage: 'New',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.newWorkspaceAriaLabel', {
      defaultMessage: 'New Workspace',
    }),
    tooltip: i18n.translate('xpack.graph.topNavMenu.newWorkspaceTooltip', {
      defaultMessage: 'Create a new workspace',
    }),
    run: function () {
        // TODO move this into a saga
        // TODO implement can wipe workspace as a selector
  function canWipeWorkspace(yesFn, noFn) {
    if (selectedFieldsSelector(store.getState()).length === 0 && $scope.workspace === null) {
      yesFn();
      return;
    }
    const confirmModalOptions = {
      onConfirm: yesFn,
      onCancel: noFn || (() => {}),
      confirmButtonText: i18n.translate('xpack.graph.clearWorkspace.confirmButtonLabel', {
        defaultMessage: 'Continue',
      }),
      title: i18n.translate('xpack.graph.clearWorkspace.modalTitle', {
        defaultMessage: 'Discard changes to workspace?',
      }),
    };
    confirmModal(i18n.translate('xpack.graph.clearWorkspace.confirmText', {
      defaultMessage: 'Once you discard changes made to a workspace, there is no getting them back.',
    }), confirmModalOptions);
  }
      canWipeWorkspace(function () {
        $scope.$evalAsync(() => {
          kbnUrl.change('/workspace/', {});
        });
      });  },
    testId: 'graphNewButton',
  },

  // if saving is disabled using uiCapabilities, we don't want to render the save
  // button so it's consistent with all of the other applications
    // allSavingDisabled is based on the xpack.graph.savePolicy, we'll maintain this functionality
    saveCapability ? {
      key: 'save',
      label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
        defaultMessage: 'Save workspace',
      }),
      tooltip: () => {
        if (allSavingDisabled) {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
            defaultMessage: 'No changes to saved workspaces are permitted by the current save policy',
          });
        } else {
          return i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
            defaultMessage: 'Save this workspace',
          });
        }
      },
      disableButton: function () {
        return allSavingDisabled || selectedFieldsSelector(store.getState());
      },
      run: () => {
        store.dispatch({
          type: 'x-pack/graph/SAVE_WORKSPACE',
          payload: $route.current.locals.savedWorkspace,
        });
      },
      testId: 'graphSaveButton',
    } : undefined,
    {
    key: 'inspect',
    disableButton: function () { return $scope.workspace === null; },
    label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
      defaultMessage: 'Inspect',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.inspectAriaLabel', {
      defaultMessage: 'Inspect',
    }),
    run: () => {
      $scope.$evalAsync(() => {
        const curState = $scope.menus.showInspect;
        $scope.closeMenus();
        $scope.menus.showInspect = !curState;
      });
    },
},{
    key: 'settings',
    disableButton: function () { return datasourceSelector(store.getState()).type === 'none'; },
    label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
      defaultMessage: 'Settings',
    }),
    description: i18n.translate('xpack.graph.topNavMenu.settingsAriaLabel', {
      defaultMessage: 'Settings',
    }),
    run: () => {
        // TODO move this stuff into a saga
      const settingsObservable = asAngularSyncedObservable(() => ({
        advancedSettings: { ...$scope.exploreControls },
        updateAdvancedSettings: (updatedSettings) => {
          $scope.exploreControls = updatedSettings;
          if ($scope.workspace) {
            $scope.workspace.options.exploreControls = updatedSettings;
          }
        },
        blacklistedNodes: $scope.workspace ? [...$scope.workspace.blacklistedNodes] : undefined,
        unblacklistNode: $scope.workspace ? $scope.workspace.unblacklist : undefined,
        urlTemplates: [...$scope.urlTemplates],
        removeUrlTemplate: $scope.removeUrlTemplate,
        saveUrlTemplate: $scope.saveUrlTemplate,
        allFields: [...$scope.allFields],
        canEditDrillDownUrls: chrome.getInjected('canEditDrillDownUrls')
      }), $scope.$digest.bind($scope));
      npStart.core.overlays.openFlyout(<Settings observable={settingsObservable} />, {
        size: 'm',
        closeButtonAriaLabel: i18n.translate('xpack.graph.settings.closeLabel', { defaultMessage: 'Close' }),
        'data-test-subj': 'graphSettingsFlyout',
        ownFocus: true,
        className: 'gphSettingsFlyout',
        maxWidth: 520,
      });
    },
  }
    ];
  return <TopNavMenu {...props} name="Graph" config={} />;
}
