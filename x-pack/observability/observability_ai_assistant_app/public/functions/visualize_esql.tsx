/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type {
  InlineEditLensEmbeddableContext,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type {
  ChatActionClickHandler,
  ObservabilityAIAssistantPublicStart,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import {
  ChatActionClickType,
  VisualizeESQLUserIntention,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import useAsync from 'react-use/lib/useAsync';
import { v4 as uuidv4 } from 'uuid';
import { VisualizeESQLFunctionArguments } from '../../common/functions/visualize_esql';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../types';

enum ChartType {
  XY = 'XY',
  Bar = 'Bar',
  Line = 'Line',
  Area = 'Area',
  Donut = 'Donut',
  Heatmap = 'Heat map',
  Treemap = 'Treemap',
  Tagcloud = 'Tag cloud',
  Waffle = 'Waffle',
  Table = 'Table',
}

interface VisualizeQueryResponsev0 {
  content: DatatableColumn[];
}

interface VisualizeQueryResponsev1 {
  data: {
    columns: DatatableColumn[];
    userOverrides?: unknown;
  };
  content: {
    message: string;
  };
}

type VisualizeQueryResponse = VisualizeQueryResponsev0 | VisualizeQueryResponsev1;

interface VisualizeESQLProps {
  /** Lens start contract, get the ES|QL charts suggestions api */
  lens: LensPublicStart;
  /** Dataviews start contract, creates an adhoc dataview */
  dataViews: DataViewsServicePublic;
  /** UiActions start contract, triggers the inline editing flyout */
  uiActions: UiActionsStart;
  /** Datatable columns as returned from the ES|QL _query api, slightly processed to be kibana compliant */
  columns: DatatableColumn[];
  /** The ES|QL query */
  query: string;
  /** Actions handler */
  onActionClick: ChatActionClickHandler;
  /** Optional, overwritten ES|QL Lens chart attributes
   * If not given, the embeddable gets them from the suggestions api
   */
  userOverrides?: unknown;
  /** User's preferation chart type as it comes from the model */
  preferredChartType?: ChartType;
  ObservabilityAIAssistantMultipaneFlyoutContext: ObservabilityAIAssistantPublicStart['ObservabilityAIAssistantMultipaneFlyoutContext'];
}

function generateId() {
  return uuidv4();
}

export function VisualizeESQL({
  lens,
  dataViews,
  uiActions,
  columns,
  query,
  onActionClick,
  userOverrides,
  preferredChartType,
  ObservabilityAIAssistantMultipaneFlyoutContext,
}: VisualizeESQLProps) {
  // fetch the pattern from the query
  const indexPattern = getIndexPatternFromESQLQuery(query);
  const lensHelpersAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return getESQLAdHocDataview(indexPattern, dataViews);
  }, [indexPattern]);

  const chatFlyoutSecondSlotHandler = useContext(ObservabilityAIAssistantMultipaneFlyoutContext);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [lensInput, setLensInput] = useState<TypedLensByValueInput | undefined>(
    userOverrides as TypedLensByValueInput
  );
  const [lensLoadEvent, setLensLoadEvent] = useState<
    InlineEditLensEmbeddableContext['lensEvent'] | null
  >(null);

  const onLoad = useCallback(
    (
      isLoading: boolean,
      adapters: InlineEditLensEmbeddableContext['lensEvent']['adapters'] | undefined,
      lensEmbeddableOutput$?: InlineEditLensEmbeddableContext['lensEvent']['embeddableOutput$']
    ) => {
      const adapterTables = adapters?.tables?.tables;
      if (adapterTables && !isLoading) {
        setLensLoadEvent({
          adapters,
          embeddableOutput$: lensEmbeddableOutput$,
        });
      }
    },
    []
  );

  // initialization
  useEffect(() => {
    if (lensHelpersAsync.value && dataViewAsync.value && !lensInput) {
      const context = {
        dataViewSpec: dataViewAsync.value?.toSpec(),
        fieldName: '',
        textBasedColumns: columns,
        query: {
          esql: query,
        },
      };

      const chartSuggestions = lensHelpersAsync.value.suggestions(
        context,
        dataViewAsync.value,
        [],
        preferredChartType
      );

      if (chartSuggestions?.length) {
        const [suggestion] = chartSuggestions;

        const attrs = getLensAttributesFromSuggestion({
          filters: [],
          query: {
            esql: query,
          },
          suggestion,
          dataView: dataViewAsync.value,
        }) as TypedLensByValueInput['attributes'];

        const lensEmbeddableInput = {
          attributes: attrs,
          id: generateId(),
        };
        setLensInput(lensEmbeddableInput);
      }
    }
  }, [columns, dataViewAsync.value, lensHelpersAsync.value, lensInput, query, preferredChartType]);

  // trigger options to open the inline editing flyout correctly
  const triggerOptions: InlineEditLensEmbeddableContext | undefined = useMemo(() => {
    if (lensLoadEvent && lensInput?.attributes) {
      return {
        attributes: lensInput?.attributes,
        lensEvent: lensLoadEvent,
        onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
          if (lensInput) {
            const newInput = {
              ...lensInput,
              attributes: newAttributes,
            };
            setLensInput(newInput);
          }
        },
        onApply: (newAttributes: TypedLensByValueInput['attributes']) => {
          const newInput = {
            ...lensInput,
            attributes: newAttributes,
          };
          onActionClick({
            type: ChatActionClickType.updateVisualization,
            userOverrides: newInput,
            query,
          });
          chatFlyoutSecondSlotHandler?.setVisibility?.(false);
          if (chatFlyoutSecondSlotHandler?.container) {
            ReactDOM.unmountComponentAtNode(chatFlyoutSecondSlotHandler.container);
          }
        },
        onCancel: () => {
          onActionClick({
            type: ChatActionClickType.updateVisualization,
            userOverrides: lensInput,
            query,
          });
          chatFlyoutSecondSlotHandler?.setVisibility?.(false);
          if (chatFlyoutSecondSlotHandler?.container) {
            ReactDOM.unmountComponentAtNode(chatFlyoutSecondSlotHandler.container);
          }
        },
        container: chatFlyoutSecondSlotHandler?.container,
      };
    }
  }, [chatFlyoutSecondSlotHandler, lensInput, lensLoadEvent, onActionClick, query]);

  if (!lensHelpersAsync.value || !dataViewAsync.value || !lensInput) {
    return <EuiLoadingSpinner />;
  }

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiToolTip
              content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.edit', {
                defaultMessage: 'Edit visualization',
              })}
            >
              <EuiButtonIcon
                size="xs"
                iconType="pencil"
                onClick={() => {
                  chatFlyoutSecondSlotHandler?.setVisibility?.(true);
                  if (triggerOptions) {
                    uiActions.getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER').exec(triggerOptions);
                  }
                }}
                data-test-subj="observabilityAiAssistantLensESQLEditButton"
                aria-label={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.edit', {
                  defaultMessage: 'Edit visualization',
                })}
              />
            </EuiToolTip>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.observabilityAiAssistant.lensESQLFunction.save', {
                  defaultMessage: 'Save visualization',
                })}
              >
                <EuiButtonIcon
                  size="xs"
                  iconType="save"
                  onClick={() => setIsSaveModalOpen(true)}
                  data-test-subj="observabilityAiAssistantLensESQLSaveButton"
                  aria-label={i18n.translate(
                    'xpack.observabilityAiAssistant.lensESQLFunction.save',
                    {
                      defaultMessage: 'Save visualization',
                    }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="observabilityAiAssistantESQLLensChart">
          <lens.EmbeddableComponent
            {...lensInput}
            style={{
              height: 240,
            }}
            onLoad={onLoad}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
          // For now, we don't want to allow saving ESQL charts to the library
          isSaveable={false}
        />
      ) : null}
    </>
  );
}

export function registerVisualizeQueryRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  registerRenderFunction(
    'visualize_query',
    ({
      arguments: { query, userOverrides, intention },
      response,
      onActionClick,
    }: Parameters<RenderFunction<VisualizeESQLFunctionArguments, {}>>[0]) => {
      const typedResponse = response as VisualizeQueryResponse;

      const columns = 'data' in typedResponse ? typedResponse.data.columns : typedResponse.content;

      if ('data' in typedResponse && 'userOverrides' in typedResponse.data) {
        userOverrides = typedResponse.data.userOverrides;
      }

      let preferredChartType: ChartType | undefined;

      switch (intention) {
        case VisualizeESQLUserIntention.executeAndReturnResults:
        case VisualizeESQLUserIntention.generateQueryOnly:
        case VisualizeESQLUserIntention.visualizeAuto:
          break;

        case VisualizeESQLUserIntention.visualizeBar:
          preferredChartType = ChartType.Bar;
          break;

        case VisualizeESQLUserIntention.visualizeDonut:
          preferredChartType = ChartType.Donut;
          break;

        case VisualizeESQLUserIntention.visualizeHeatmap:
          preferredChartType = ChartType.Heatmap;
          break;

        case VisualizeESQLUserIntention.visualizeLine:
          preferredChartType = ChartType.Line;
          break;

        case VisualizeESQLUserIntention.visualizeArea:
          preferredChartType = ChartType.Area;
          break;

        case VisualizeESQLUserIntention.visualizeTable:
          preferredChartType = ChartType.Table;
          break;

        case VisualizeESQLUserIntention.visualizeTagcloud:
          preferredChartType = ChartType.Tagcloud;
          break;

        case VisualizeESQLUserIntention.visualizeTreemap:
          preferredChartType = ChartType.Treemap;
          break;

        case VisualizeESQLUserIntention.visualizeWaffle:
          preferredChartType = ChartType.Waffle;
          break;

        case VisualizeESQLUserIntention.visualizeXy:
          preferredChartType = ChartType.XY;
          break;
      }

      const trimmedQuery = query.trim();

      return (
        <VisualizeESQL
          ObservabilityAIAssistantMultipaneFlyoutContext={
            pluginsStart.observabilityAIAssistant.ObservabilityAIAssistantMultipaneFlyoutContext
          }
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          uiActions={pluginsStart.uiActions}
          columns={columns}
          query={trimmedQuery}
          onActionClick={onActionClick}
          userOverrides={userOverrides}
          preferredChartType={preferredChartType}
        />
      );
    }
  );
}
