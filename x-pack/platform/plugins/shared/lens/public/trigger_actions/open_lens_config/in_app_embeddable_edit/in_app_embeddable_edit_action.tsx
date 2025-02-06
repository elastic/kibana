/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type {
  LensEmbeddableStartServices,
  TypedLensByValueInput,
} from '../../../react_embeddable/types';
import type { InlineEditLensEmbeddableContext } from './types';

const ACTION_EDIT_LENS_EMBEDDABLE = 'ACTION_EDIT_LENS_EMBEDDABLE';

export function isEmbeddableEditActionCompatible(
  core: CoreStart,
  attributes: TypedLensByValueInput['attributes']
) {
  // for ES|QL is compatible only when advanced setting is enabled
  const query = attributes.state.query;
  return isOfAggregateQueryType(query) ? core.uiSettings.get(ENABLE_ESQL) : true;
}

export class EditLensEmbeddableAction implements Action<InlineEditLensEmbeddableContext> {
  public type = ACTION_EDIT_LENS_EMBEDDABLE;
  public id = ACTION_EDIT_LENS_EMBEDDABLE;
  public order = 50;

  constructor(
    protected readonly core: CoreStart,
    protected readonly loadEmbeddableServices: () => Promise<LensEmbeddableStartServices>
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.editLensEmbeddableLabel', {
      defaultMessage: 'Edit visualization',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ attributes }: InlineEditLensEmbeddableContext) {
    return isEmbeddableEditActionCompatible(this.core, attributes);
  }

  public async execute({
    attributes,
    lensEvent,
    container,
    onUpdate,
    onApply,
    onCancel,
  }: InlineEditLensEmbeddableContext) {
    const isCompatibleAction = isEmbeddableEditActionCompatible(this.core, attributes);
    if (!isCompatibleAction) {
      throw new IncompatibleActionError();
    }
    const [{ executeEditEmbeddableAction }, services] = await Promise.all([
      import('../../../async_services'),
      this.loadEmbeddableServices(),
    ]);
    if (attributes) {
      executeEditEmbeddableAction({
        deps: services,
        core: this.core,
        attributes,
        lensEvent,
        container,
        onUpdate,
        onApply,
        onCancel,
      });
    }
  }
}
