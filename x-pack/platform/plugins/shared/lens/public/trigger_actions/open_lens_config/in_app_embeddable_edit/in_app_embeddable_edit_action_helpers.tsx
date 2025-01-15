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
import '../helpers.scss';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { generateId } from '../../../id_generator';
import { setupPanelManagement } from '../../../react_embeddable/inline_editing/panel_management';
import { prepareInlineEditPanel } from '../../../react_embeddable/inline_editing/setup_inline_editing';
import { mountInlineEditPanel } from '../../../react_embeddable/inline_editing/mount';
import type { TypedLensByValueInput, LensRuntimeState } from '../../../react_embeddable/types';
import type { LensPluginStartDependencies } from '../../../plugin';
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

export async function executeEditEmbeddableAction({
  deps,
  core,
  attributes,
  lensEvent,
  container,
  onUpdate,
  onApply,
  onCancel,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  attributes: TypedLensByValueInput['attributes'];
  lensEvent: LensChartLoadEvent;
  container?: HTMLElement | null;
  onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onApply?: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onCancel?: () => void;
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
  });
  const openInlineEditor = prepareInlineEditPanel(
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

  const ConfigPanel = await openInlineEditor({
    onApply,
    onCancel,
  });
  if (ConfigPanel) {
    // no need to pass the uuid in this use case
    mountInlineEditPanel(ConfigPanel, core, undefined, undefined, container);
  }
}
