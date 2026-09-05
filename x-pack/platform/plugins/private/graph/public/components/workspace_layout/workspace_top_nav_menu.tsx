/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Provider, useSelector, useStore } from 'react-redux';
import type { Capabilities, CoreStart } from '@kbn/core/public';
import { useHistory, useLocation } from 'react-router-dom';
import type {
  Start as InspectorPublicPluginStart,
  RequestAdapter,
} from '@kbn/inspector-plugin/public';
import { AppHeader, type AppHeaderBack, type AppHeaderMenu } from '@kbn/app-header';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { GraphState } from '../../state_management';
import { datasourceSelector, hasFieldsSelector, metaDataSelector } from '../../state_management';
import type { GraphSavePolicy, GraphWorkspaceSavedObject, Workspace } from '../../types';
import type { AsObservable, SettingsWorkspaceProps } from '../settings';
import { Settings } from '../settings';
import { asSyncedObservable } from '../../helpers/as_observable';
import { useInspector } from '../../helpers/use_inspector';
import { getHomePath } from '../../services/url';

interface WorkspaceTopNavMenuProps {
  workspace: Workspace | undefined;
  confirmWipeWorkspace: (
    onConfirm: () => void,
    text?: string,
    options?: { confirmButtonText: string; title: string }
  ) => void;
  savedWorkspace: GraphWorkspaceSavedObject;
  graphSavePolicy: GraphSavePolicy;
  capabilities: Capabilities;
  inspect: InspectorPublicPluginStart;
  coreStart: CoreStart;
  canEditDrillDownUrls: boolean;
  isInitialized: boolean;
  requestAdapter: RequestAdapter;
}

export const WorkspaceTopNavMenu = (props: WorkspaceTopNavMenuProps) => {
  const store = useStore<GraphState>();
  const location = useLocation();
  const history = useHistory();
  const title = useSelector(metaDataSelector).title;
  const hasFields = useSelector(hasFieldsSelector);
  const datasource = useSelector(datasourceSelector);
  const allSavingDisabled = props.graphSavePolicy === 'none';
  const isInspectDisabled = !props.workspace?.lastRequest;
  const canSave = Boolean(props.capabilities.graph.save);

  const { confirmWipeWorkspace, savedWorkspace, workspace } = props;

  const { onOpenInspector } = useInspector({
    inspect: props.inspect,
    requestAdapter: props.requestAdapter,
  });

  const back = useMemo<AppHeaderBack>(
    () => ({
      href: history.createHref({ pathname: getHomePath() }),
      label: i18n.translate('xpack.graph.home.breadcrumb', {
        defaultMessage: 'Graph',
      }),
      onClick: (event) => {
        event.preventDefault();
        confirmWipeWorkspace(() => {
          history.push(getHomePath());
        });
      },
    }),
    [confirmWipeWorkspace, history]
  );

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [
      {
        id: 'new',
        label: i18n.translate('xpack.graph.topNavMenu.newWorkspaceLabel', {
          defaultMessage: 'New',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.newWorkspaceAriaLabel', {
          defaultMessage: 'New Workspace',
        }),
        tooltipContent: i18n.translate('xpack.graph.topNavMenu.newWorkspaceTooltip', {
          defaultMessage: 'Create a new workspace',
        }),
        iconType: 'plus',
        disableButton: !props.isInitialized,
        run() {
          confirmWipeWorkspace(() => {
            if (location.pathname === '/workspace/') {
              history.go(0);
            } else {
              history.push('/workspace/');
            }
          });
        },
        testId: 'graphNewButton',
      },
      {
        id: 'inspect',
        disableButton: isInspectDisabled,
        label: i18n.translate('xpack.graph.topNavMenu.inspectLabel', {
          defaultMessage: 'Inspect',
        }),
        iconType: 'inspect',
        run: () => {
          onOpenInspector();
        },
        tooltipContent: isInspectDisabled
          ? i18n.translate('xpack.graph.topNavMenu.inspectButton.disabledTooltip', {
              defaultMessage: 'Perform a search or expand a node to enable Inspect',
            })
          : undefined,
        testId: 'graphInspectButton',
      },
      {
        id: 'settings',
        disableButton: datasource.current.type === 'none',
        label: i18n.translate('xpack.graph.topNavMenu.settingsLabel', {
          defaultMessage: 'Settings',
        }),
        iconType: 'gear',
        run: () => {
          const currentWorkspace = workspace as Workspace;

          const settingsObservable = asSyncedObservable(() => ({
            blocklistedNodes: currentWorkspace.blocklistedNodes,
            unblockNode: currentWorkspace.unblockNode,
            unblockAll: currentWorkspace.unblockAll,
            canEditDrillDownUrls: props.canEditDrillDownUrls,
          })) as unknown as AsObservable<SettingsWorkspaceProps>['observable'];

          props.coreStart.overlays.openFlyout(
            toMountPoint(
              <Provider store={store}>
                <Settings observable={settingsObservable} />
              </Provider>,
              props.coreStart
            ),
            {
              size: 'm',
              closeButtonProps: {
                'aria-label': i18n.translate('xpack.graph.settings.closeLabel', {
                  defaultMessage: 'Close',
                }),
              },
              'data-test-subj': 'graphSettingsFlyout',
              ownFocus: true,
              className: 'gphSettingsFlyout',
              maxWidth: 520,
              'aria-label': i18n.translate('xpack.graph.settings.ariaLabel', {
                defaultMessage: 'Settings',
              }),
            }
          );
        },
        testId: 'graphSettingsButton',
      },
    ];

    if (!canSave) {
      return { items };
    }

    return {
      items,
      primaryActionItem: {
        id: 'save',
        label: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledLabel', {
          defaultMessage: 'Save',
        }),
        description: i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledAriaLabel', {
          defaultMessage: 'Save workspace',
        }),
        iconType: 'save',
        tooltipContent: allSavingDisabled
          ? i18n.translate('xpack.graph.topNavMenu.saveWorkspace.disabledTooltip', {
              defaultMessage:
                'No changes to saved workspaces are permitted by the current save policy',
            })
          : i18n.translate('xpack.graph.topNavMenu.saveWorkspace.enabledTooltip', {
              defaultMessage: 'Save this workspace',
            }),
        disableButton: allSavingDisabled || !hasFields,
        run: () => {
          store.dispatch({ type: 'x-pack/graph/SAVE_WORKSPACE', payload: savedWorkspace });
        },
        testId: 'graphSaveButton',
      },
    };
  }, [
    allSavingDisabled,
    canSave,
    confirmWipeWorkspace,
    datasource,
    hasFields,
    history,
    isInspectDisabled,
    location.pathname,
    onOpenInspector,
    props.canEditDrillDownUrls,
    props.coreStart,
    props.isInitialized,
    savedWorkspace,
    store,
    workspace,
  ]);

  return <AppHeader title={title} back={back} menu={menu} />;
};
