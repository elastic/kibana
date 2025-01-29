/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { TypedLensSerializedState } from '../../../react_embeddable/types';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  makeConfigureStore,
  LensRootStore,
  loadInitial,
  initExisting,
  initEmpty,
} from '../../../state_management';
import { generateId } from '../../../id_generator';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { LensEditConfigurationFlyout } from './lens_configuration_flyout';
import type { EditConfigPanelProps } from './types';
import { SavedObjectIndexStore, type LensDocument } from '../../../persistence';
import { DOC_TYPE } from '../../../../common/constants';

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
      if (initExisting.match(action) || initEmpty.match(action)) {
        return;
      }

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
      aria-labelledby={i18n.translate('xpack.lens.config.editLabel', {
        defaultMessage: 'Edit configuration',
      })}
      size="s"
      hideCloseButton
      css={css`
        clip-path: polygon(-100% 0, 100% 0, 100% 100%, -100% 100%);
      `}
    >
      {children}
    </EuiFlyout>
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
    getLensAttributeService(coreStart, startDependencies)
  );

  return ({
    attributes,
    updatePanelState,
    updateSuggestion,
    closeFlyout,
    wrapInFlyout,
    datasourceId,
    panelId,
    savedObjectId,
    dataLoading$,
    lensAdapters,
    updateByRefInput,
    navigateToLensEditor,
    displayFlyoutHeader,
    canEditTextBasedQuery,
    isNewPanel,
    hidesSuggestions,
    onApply,
    onCancel,
    hideTimeFilterInfo,
    parentApi,
  }: EditLensConfigurationProps) => {
    if (!lensServices || !datasourceMap || !visualizationMap) {
      return <LoadingSpinnerWithOverlay />;
    }
    const [currentAttributes, setCurrentAttributes] =
      useState<TypedLensSerializedState['attributes']>(attributes);
    /**
     * During inline editing of a by reference panel, the panel is converted to a by value one.
     * When the user applies the changes we save them to the Lens SO
     */
    const saveByRef = useCallback(
      async (attrs: LensDocument) => {
        const savedObjectStore = new SavedObjectIndexStore(lensServices.contentManagement);
        await savedObjectStore.save({
          ...attrs,
          savedObjectId,
          type: DOC_TYPE,
        });
      },
      [savedObjectId]
    );
    const datasourceState = currentAttributes.state.datasourceStates[datasourceId];
    const storeDeps = {
      lensServices,
      datasourceMap,
      visualizationMap,
      initialContext:
        datasourceState && 'initialContext' in datasourceState
          ? datasourceState.initialContext
          : undefined,
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
      })
    );

    const configPanelProps = {
      attributes: currentAttributes,
      updatePanelState,
      updateSuggestion,
      closeFlyout,
      datasourceId,
      coreStart,
      startDependencies,
      visualizationMap,
      dataLoading$,
      lensAdapters,
      datasourceMap,
      saveByRef,
      savedObjectId,
      updateByRefInput,
      navigateToLensEditor,
      displayFlyoutHeader,
      canEditTextBasedQuery,
      hidesSuggestions,
      setCurrentAttributes,
      isNewPanel,
      onApply,
      onCancel,
      hideTimeFilterInfo,
      parentApi,
      panelId,
    };

    return (
      <MaybeWrapper wrapInFlyout={wrapInFlyout} closeFlyout={closeFlyout}>
        <Provider store={lensStore}>
          <KibanaRenderContextProvider {...coreStart}>
            <KibanaContextProvider services={lensServices}>
              <RootDragDropProvider>
                <LensEditConfigurationFlyout {...configPanelProps} />
              </RootDragDropProvider>
            </KibanaContextProvider>
          </KibanaRenderContextProvider>
        </Provider>
      </MaybeWrapper>
    );
  };
}
