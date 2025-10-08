/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { generateId } from '../../../id_generator';
import { setupPanelManagement } from '../../../react_embeddable/inline_editing/panel_management';
import { prepareInlineEditPanel } from '../../../react_embeddable/inline_editing/setup_inline_editing';
import type { TypedLensByValueInput, LensRuntimeState } from '../../../react_embeddable/types';
import type { LensChartLoadEvent } from './types';

const asyncNoop = async () => {};

export function isEmbeddableEditActionCompatible(
  core: CoreStart,
  attributes: TypedLensByValueInput['attributes']
) {
  // for ES|QL is compatible only when advanced setting is enabled
  const query = attributes.state.query;
  return isOfAggregateQueryType(query) ? core.uiSettings.get(ENABLE_ESQL) : true;
}

export async function getEditEmbeddableFlyout({
  core,
  deps,
  attributes,
  lensEvent,
  container,
  onUpdate,
  onApply,
  onCancel,
  closeFlyout,
  applyButtonLabel,
}: {
  core: CoreStart;
  deps: LensPluginStartDependencies & {
    visualizationMap: VisualizationMap;
    datasourceMap: DatasourceMap;
  };
  attributes: TypedLensByValueInput['attributes'];
  lensEvent: LensChartLoadEvent;
  container?: HTMLElement | null;
  onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onApply?: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onCancel?: () => void;
  closeFlyout: () => void;
  applyButtonLabel?: string;
}) {
  const isCompatibleAction = isEmbeddableEditActionCompatible(core, attributes);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const uuid = generateId();
  const isNewlyCreated$ = new BehaviorSubject<boolean>(false);
  const panelManagementApi = setupPanelManagement(uuid, container, {
    isNewlyCreated$,
    setAsCreated: () => isNewlyCreated$.next(false),
    isReadOnly: () => false,
    canEdit: () => true,
  });
  const getInlineEditor = prepareInlineEditPanel(
    { attributes },
    () => ({ attributes }),
    (newState: LensRuntimeState) =>
      onUpdate(newState.attributes as TypedLensByValueInput['attributes']),
    {
      dataLoading$:
        lensEvent?.dataLoading$ ??
        (new BehaviorSubject(undefined) as PublishingSubject<boolean | undefined>),
      isNewlyCreated$,
    },
    panelManagementApi,
    {
      getInspectorAdapters: () => lensEvent?.adapters,
      inspect(): OverlayRef {
        return { close: asyncNoop, onClose: Promise.resolve() };
      },
      closeInspector: asyncNoop,
      adapters$: new BehaviorSubject(lensEvent?.adapters),
    },
    { coreStart: core, ...deps }
  );
  const ConfigPanel = await getInlineEditor({
    onApply,
    onCancel,
    closeFlyout,
    applyButtonLabel,
  });
  return ConfigPanel;
}
