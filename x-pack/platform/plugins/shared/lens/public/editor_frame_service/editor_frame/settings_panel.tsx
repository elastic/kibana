/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { css } from '@emotion/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import chroma from 'chroma-js';

import { EuiText, EuiTitle, EuiAccordion, useEuiTheme } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExecutionContextSearch } from '@kbn/es-query';
import type { ReactExpressionRendererType } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';

import type {
  FramePublicAPI,
  DatasourceMap,
  VisualizationMap,
  UserMessagesGetter,
  Visualization,
} from '../../types';
import {
  selectActiveDatasourceId,
  selectDatasourceStates,
  selectExecutionContextSearch,
  selectIsFullscreenDatasource,
  selectSearchSessionId,
  selectSelectedLayerId,
  selectResolvedDateRange,
  selectVisualization,
  useLensDispatch,
  useLensSelector,
  updateDatasourceState,
  updateVisualizationState,
} from '../../state_management';

const LOCAL_STORAGE_SETTINGS_PANEL = 'LENS_SETTINGS_PANEL_HIDDEN';

export interface SettingsPanelProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  ExpressionRenderer: ReactExpressionRendererType;
  framePublicAPI: FramePublicAPI;
  getUserMessages?: UserMessagesGetter;
  nowProvider: DataPublicPluginStart['nowProvider'];
  core: CoreStart;
  showOnlyIcons?: boolean;
  isAccordionOpen?: boolean;
  toggleAccordionCb?: (flag: boolean) => void;
}

export const SettingsPanelWrapper = (props: SettingsPanelProps) => {
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? props.visualizationMap[visualization.activeId]
    : null;

  const isFullscreenDatasource = useLensSelector(selectIsFullscreenDatasource);
  const layerId = useLensSelector(selectSelectedLayerId);

  const showSettingsPanel =
    !isFullscreenDatasource && activeVisualization && visualization.state && layerId;
  return showSettingsPanel ? (
    <SettingsPanel {...props} activeVisualization={activeVisualization} layerId={layerId} />
  ) : null;
};

export function SettingsPanel(
  props: SettingsPanelProps & {
    activeVisualization: Visualization;
    layerId: string;
  }
) {
  const { activeVisualization, framePublicAPI, layerId, toggleAccordionCb, isAccordionOpen } =
    props;

  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const dateRange = useLensSelector(selectResolvedDateRange);

  const datasourcePublicAPI = framePublicAPI.datasourceLayers?.[layerId];
  const datasourceId = datasourcePublicAPI?.datasourceId! as 'formBased' | 'textBased';
  let layerDatasourceState = datasourceStates?.[datasourceId]?.state;
  // try again with aliases
  if (!layerDatasourceState && datasourcePublicAPI?.datasourceAliasIds && datasourceStates) {
    const aliasId = datasourcePublicAPI.datasourceAliasIds.find(
      (id) => datasourceStates?.[id]?.state
    );
    if (aliasId) {
      layerDatasourceState = datasourceStates[aliasId].state;
    }
  }
  const layerDatasource = datasourceId ? props.datasourceMap[datasourceId] : undefined;

  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const visualization = useLensSelector(selectVisualization);

  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const dispatchLens = useLensDispatch();

  const visualizationLayerSettings = useMemo(
    () =>
      activeVisualization.hasLayerSettings?.({
        layerId,
        state: visualization.state,
        frame: framePublicAPI,
      }) || { data: false, appearance: false },
    [activeVisualization, layerId, framePublicAPI, visualization.state]
  );

  // get user's selection from localStorage, this key defines if the suggestions panel will be hidden or not
  const initialAccordionStatusValue = isAccordionOpen != null ? !Boolean(isAccordionOpen) : false;
  const [hideSettings, setHideSettings] = useLocalStorage(
    LOCAL_STORAGE_SETTINGS_PANEL,
    initialAccordionStatusValue
  );
  useEffect(() => {
    if (isAccordionOpen != null) {
      setHideSettings(!Boolean(isAccordionOpen));
    }
  }, [isAccordionOpen, setHideSettings]);

  const toggleSettings = useCallback(() => {
    setHideSettings(!hideSettings);
    toggleAccordionCb?.(!hideSettings);
  }, [setHideSettings, hideSettings, toggleAccordionCb]);

  const context: ExecutionContextSearch = useLensSelector(selectExecutionContextSearch);
  const searchSessionId = useLensSelector(selectSearchSessionId);

  const contextRef = useRef<ExecutionContextSearch>(context);
  contextRef.current = context;

  const sessionIdRef = useRef<string>(searchSessionId);
  sessionIdRef.current = searchSessionId;

  const updateVisualization = useMemo(
    () => (newState: unknown) => {
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    },
    [activeVisualization.id, dispatchLens]
  );

  const updateDatasource = useMemo(
    () =>
      (
        newDatasourceId: string | undefined,
        newState: unknown,
        dontSyncLinkedDimensions?: boolean
      ) => {
        if (newDatasourceId) {
          dispatchLens(
            updateDatasourceState({
              newDatasourceState:
                typeof newState === 'function'
                  ? newState(datasourceStates[newDatasourceId].state)
                  : newState,
              datasourceId: newDatasourceId,
              clearStagedPreview: false,
              dontSyncLinkedDimensions,
            })
          );
        }
      },
    [dispatchLens, datasourceStates]
  );

  if (!activeDatasourceId) {
    return null;
  }

  const title = (
    <EuiTitle
      size="xxs"
      css={css`
        padding: 2px;
      `}
    >
      <h3>
        <FormattedMessage
          id="xpack.lens.editorFrame.settingsPanelTitle"
          defaultMessage="Settings"
        />
      </h3>
    </EuiTitle>
  );

  const dangerAlpha10 = chroma(euiTheme.colors.danger).alpha(0.1).css();

  const layerDatasourceConfigProps = {
    state: layerDatasourceState,
    setState: (newState: unknown) => {
      updateDatasource(datasourceId, newState);
    },
    layerId,
    frame: props.framePublicAPI,
    dateRange,
  };

  const layerVisualizationConfigProps = {
    layerId,
    state: visualization.state,
    frame: props.framePublicAPI,
    dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  return (
    <EuiAccordion
      id="lensSettingsPanel"
      buttonProps={{
        'data-test-subj': 'lensSettingsPanelToggleButton',
        paddingSize: 'm',
      }}
      css={css`
        .euiAccordion__buttonContent {
          width: 100%;
        }
      `}
      buttonContent={title}
      forceState={hideSettings ? 'closed' : 'open'}
      onToggle={toggleSettings}
    >
      <div
        className="eui-scrollBar"
        data-test-subj="lnsSettingsPanel"
        role="list"
        tabIndex={0}
        css={css`
          flex-wrap: 'nowrap';
          gap: 0;
          overflow-x: scroll;
          overflow-y: hidden;
          display: flex;
          padding-top: ${euiTheme.size.xs};
          mask-image: linear-gradient(
            to right,
            ${dangerAlpha10} 0%,
            ${euiTheme.colors.danger} 5px,
            ${euiTheme.colors.danger} calc(100% - 5px),
            ${dangerAlpha10} 100%
          );
        `}
      >
        <div id={layerId}>
          <div className="lnsIndexPatternDimensionEditor--padded">
            {layerDatasource?.LayerSettingsComponent || visualizationLayerSettings.data ? (
              <EuiText
                size="s"
                css={css`
                  margin-bottom: ${euiTheme.size.base};
                `}
              >
                <h4>
                  {i18n.translate('xpack.lens.editorFrame.layerSettings.headingData', {
                    defaultMessage: 'Data',
                  })}
                </h4>
              </EuiText>
            ) : null}
            {layerDatasource?.LayerSettingsComponent && (
              <layerDatasource.LayerSettingsComponent {...layerDatasourceConfigProps} />
            )}
            {activeVisualization?.LayerSettingsComponent && visualizationLayerSettings.data ? (
              <activeVisualization.LayerSettingsComponent
                {...{
                  ...layerVisualizationConfigProps,
                  setState: updateVisualization,
                  panelRef: settingsPanelRef,
                  section: 'data',
                }}
              />
            ) : null}
            {visualizationLayerSettings.appearance ? (
              <EuiText
                size="s"
                css={css`
                  margin-bottom: ${euiTheme.size.base};
                `}
              >
                <h4>
                  {i18n.translate('xpack.lens.editorFrame.layerSettings.headingAppearance', {
                    defaultMessage: 'Appearance',
                  })}
                </h4>
              </EuiText>
            ) : null}
            {activeVisualization?.LayerSettingsComponent && (
              <activeVisualization.LayerSettingsComponent
                {...{
                  ...layerVisualizationConfigProps,
                  setState: updateVisualization,
                  panelRef: settingsPanelRef,
                  section: 'appearance',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </EuiAccordion>
  );
}
