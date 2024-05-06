/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { COMMON_SLO_GROUPING } from '../overview/slo_embeddable_factory';
import {
  SLO_ERROR_BUDGET_EMBEDDABLE,
  SLOErrorBudgetEmbeddable,
} from './slo_error_budget_embeddable';
import { SloPublicPluginsStart, SloPublicStart } from '../../..';
import { SloErrorBudgetEmbeddableInput } from './types';

export type SloErrorBudgetEmbeddableFactory = EmbeddableFactory;
export class SloErrorBudgetEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = SLO_ERROR_BUDGET_EMBEDDABLE;

  public readonly grouping = COMMON_SLO_GROUPING;

  constructor(
    private getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
  ) {}

  public async isEditable() {
    return true;
  }

  public async getExplicitInput(): Promise<Partial<SloErrorBudgetEmbeddableInput>> {
    const [coreStart, pluginStart] = await this.getStartServices();
    try {
      const { resolveEmbeddableSloUserInput } = await import('./handle_explicit_input');
      return await resolveEmbeddableSloUserInput(coreStart, pluginStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  public async create(initialInput: SloErrorBudgetEmbeddableInput, parent?: IContainer) {
    try {
      const [coreStart, pluginsStart] = await this.getStartServices();
      const deps = { ...coreStart, ...pluginsStart };
      return new SLOErrorBudgetEmbeddable(deps, initialInput, parent);
    } catch (e) {
      return new ErrorEmbeddable(e, initialInput, parent);
    }
  }

  public getDescription() {
    return i18n.translate('xpack.slo.sloErrorBudgetEmbeddable.description', {
      defaultMessage: 'Get an error budget burn down chart of your SLOs',
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.slo.sloErrorBudgetEmbeddable.displayName', {
      defaultMessage: 'SLO Error budget burn down',
    });
  }

  public getIconType() {
    return 'visLine';
  }
}
