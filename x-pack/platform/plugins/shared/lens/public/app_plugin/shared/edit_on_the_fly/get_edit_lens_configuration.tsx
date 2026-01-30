/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { EuiFlyout, EuiLoadingSpinner, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import type { MiddlewareAPI, Dispatch, Action } from '@reduxjs/toolkit';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { isEqual } from 'lodash';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import type {
  TypedLensSerializedState,
  DatasourceMap,
  VisualizationMap,
  LensAppServices,
  LensStoreDeps,
  LensDocument,
} from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../../plugin';
import { getActiveDatasourceIdFromDoc } from '../../../utils';
import type { LensRootStore } from '../../../state_management';
import { saveUserChartTypeToSessionStorage } from '../../../chart_type_session_storage';
import {
  makeConfigureStore,
  loadInitial,
  initExisting,
  initEmpty,
  setSelectedLayerId,
} from '../../../state_management';
import { generateId } from '../../../id_generator';
import { LensEditConfigurationFlyout } from './lens_configuration_flyout';
import type { EditConfigPanelProps } from './types';
import { LensDocumentService } from '../../../persistence';
import { DOC_TYPE } from '../../../../common/constants';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';

export type EditLensConfigurationProps = Omit<
  EditConfigPanelProps,
  | 'startDependencies'
  | 'coreStart'
  | 'visualizationMap'
  | 'datasourceMap'
  | 'saveByRef'
  | 'setCurrentAttributes'
  | 'previousAttributes'
>;
function LoadingSpinnerWithOverlay() {
  return (
    <EuiOverlayMask>
      <EuiLoadingSpinner />
    </EuiOverlayMask>
  );
}

type UpdaterType = (
  datasourceState: unknown,
  visualizationState: unknown,
  visualizationType?: string
) => void;

// exported for testing
export const updatingMiddleware =
  (updater: UpdaterType) => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    const {
      datasourceStates: prevDatasourceStates,
      visualization: prevVisualization,
      activeDatasourceId: prevActiveDatasourceId,
    } = store.getState().lens;
    next(action);
    const { datasourceStates, visualization, activeDatasourceId } = store.getState().lens;
    if (
      prevActiveDatasourceId !== activeDatasourceId ||
      !isEqual(
        prevDatasourceStates[prevActiveDatasourceId].state,
        datasourceStates[activeDatasourceId].state
      ) ||
      !isEqual(prevVisualization, visualization)
    ) {
      // ignore the actions that initialize the store with the state from the attributes
      // selectedLayerId is UI runtime state only and shouldn't trigger the updater
      if (
        initExisting.match(action) ||
        initEmpty.match(action) ||
        setSelectedLayerId.match(action)
      ) {
        return;
      }
      // The user is updating the Visualization parameters,
      // this means he is choosing this chart
      saveUserChartTypeToSessionStorage(visualization.activeId);

      updater(
        datasourceStates[activeDatasourceId].state,
        visualization.state,
        visualization.activeId
      );
    }
  };

const MaybeWrapper = ({
  wrapInFlyout,
  closeFlyout,
  children,
}: {
  wrapInFlyout?: boolean;
  children: JSX.Element;
  closeFlyout?: () => void;
}) => {
  if (!wrapInFlyout) {
    return children;
  }
  return (
    <EuiFlyout
      data-test-subj="lnsEditOnFlyFlyout"
      type="push"
      ownFocus
      paddingSize="m"
      onClose={() => {
        closeFlyout?.();
      }}
      aria-label={i18n.translate('xpack.lens.config.editLabel', {
        defaultMessage: 'Edit configuration',
      })}
      role="dialog"
      size="s"
      hideCloseButton
      css={css`
        clip-path: none; // need to override the eui-flyout clip-path for dnd outside of the flyout
      `}
    >
      {children}
    </EuiFlyout>
  );
};

const EditLensConfiguration: FC<
  EditLensConfigurationProps & {
    coreStart: CoreStart;
    startDependencies: LensPluginStartDependencies;
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
    lensServices: LensAppServices;
  }
> = ({
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  lensServices,
  attributes,
  updatePanelState,
  updateSuggestion,
  closeFlyout,
  wrapInFlyout,
  panelId,
  savedObjectId,
  dataLoading$,
  lensAdapters,
  updateByRefInput,
  navigateToLensEditor,
  displayFlyoutHeader,
  isNewPanel,
  hidesSuggestions,
  onApply,
  onCancel,
  isReadOnly,
  parentApi,
  applyButtonLabel,
  hideTextBasedEditor,
}) => {
  const [currentAttributes, setCurrentAttributes] =
    useState<TypedLensSerializedState['attributes']>(attributes);

  /**
   * During inline editing of a by reference panel, the panel is converted to a by value one.
   * When the user applies the changes we save them to the Lens SO
   */
  const saveByRef = useCallback(
    async (attrs: LensDocument) => {
      const lensDocumentService = new LensDocumentService(lensServices.http);
      await lensDocumentService.save({
        ...attrs,
        savedObjectId,
        type: DOC_TYPE,
      });
    },
    [lensServices.http, savedObjectId]
  );

  // Derive datasourceId from currentAttributes so it updates when attributes change
  // (e.g., after converting from formBased to textBased)
  const currentDatasourceId = getActiveDatasourceIdFromDoc(currentAttributes);

  if (currentDatasourceId === null) {
    return <LoadingSpinnerWithOverlay />;
  }

  const datasourceState = currentAttributes.state.datasourceStates[currentDatasourceId];

  const storeDeps: LensStoreDeps = {
    lensServices,
    datasourceMap,
    visualizationMap,
    initialContext:
      datasourceState && 'initialContext' in datasourceState
        ? datasourceState.initialContext
        : undefined,
    visualizationType: attributes.visualizationType,
  };
  const lensStore: LensRootStore = makeConfigureStore(
    storeDeps,
    undefined,
    updatingMiddleware(updatePanelState)
  );
  lensStore.dispatch(
    loadInitial({
      initialInput: {
        attributes: currentAttributes,
        id: panelId ?? generateId(),
      },
      inlineEditing: true,
      hideTextBasedEditor,
    })
  );

  const configPanelProps: EditConfigPanelProps = {
    attributes: currentAttributes,
    updatePanelState,
    updateSuggestion,
    closeFlyout,
    coreStart,
    startDependencies,
    dataLoading$,
    lensAdapters,
    saveByRef,
    savedObjectId,
    updateByRefInput,
    navigateToLensEditor,
    displayFlyoutHeader,
    hidesSuggestions,
    setCurrentAttributes,
    isNewPanel,
    onApply,
    onCancel,
    isReadOnly,
    parentApi,
    panelId,
    applyButtonLabel,
    hideTextBasedEditor,
  };

  return (
    <MaybeWrapper wrapInFlyout={wrapInFlyout} closeFlyout={closeFlyout}>
      <Provider store={lensStore}>
        <KibanaRenderContextProvider {...coreStart}>
          <KibanaContextProvider services={lensServices}>
            <EditorFrameServiceProvider
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
            >
              <RootDragDropProvider>
                {coreStart.rendering.addContext(
                  <LensEditConfigurationFlyout {...configPanelProps} />
                )}
              </RootDragDropProvider>
            </EditorFrameServiceProvider>
          </KibanaContextProvider>
        </KibanaRenderContextProvider>
      </Provider>
    </MaybeWrapper>
  );
};

export async function getEditLensConfiguration(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  visualizationMap?: VisualizationMap,
  datasourceMap?: DatasourceMap
) {
  const { getLensServices, getLensAttributeService } = await import('../../../async_services');
  const lensServices = await getLensServices(
    coreStart,
    startDependencies,
    getLensAttributeService(coreStart.http)
  );

  return (props: EditLensConfigurationProps) => {
    if (!lensServices || !datasourceMap || !visualizationMap) {
      return <LoadingSpinnerWithOverlay />;
    }

    return (
      <EditLensConfiguration
        coreStart={coreStart}
        startDependencies={startDependencies}
        visualizationMap={visualizationMap}
        datasourceMap={datasourceMap}
        lensServices={lensServices}
        {...props}
      />
    );
  };
}
