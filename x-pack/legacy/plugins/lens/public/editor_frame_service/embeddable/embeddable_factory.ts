/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Capabilities,
  HttpSetup,
  RecursiveReadonly,
  SavedObjectsClientContract,
} from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  IndexPatternsContract,
  IndexPattern,
  TimefilterContract,
} from '../../../../../../../src/plugins/data/public';
import { ReactExpressionRendererType } from '../../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactory as AbstractEmbeddableFactory,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { Embeddable } from './embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from '../../persistence';
import { getEditPath } from '../../../../../../plugins/lens/common';

export class EmbeddableFactory extends AbstractEmbeddableFactory {
  type = DOC_TYPE;

  constructor(
    private timefilter: TimefilterContract,
    private coreHttp: HttpSetup,
    private capabilities: RecursiveReadonly<Capabilities>,
    private savedObjectsClient: SavedObjectsClientContract,
    private expressionRenderer: ReactExpressionRendererType,
    private indexPatternService: IndexPatternsContract
  ) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
          defaultMessage: 'Lens Visualization',
        }),
        type: DOC_TYPE,
        getIconForSavedObject: () => 'lensApp',
      },
    });
  }

  public isEditable() {
    return this.capabilities.visualize.save as boolean;
  }

  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return i18n.translate('xpack.lens.embeddableDisplayName', {
      defaultMessage: 'lens',
    });
  }

  async createFromSavedObject(
    savedObjectId: string,
    input: Partial<EmbeddableInput> & { id: string },
    parent?: IContainer
  ) {
    const store = new SavedObjectIndexStore(this.savedObjectsClient);
    const savedVis = await store.load(savedObjectId);

    const promises = savedVis.state.datasourceMetaData.filterableIndexPatterns.map(
      async ({ id }) => {
        try {
          return await this.indexPatternService.get(id);
        } catch (error) {
          // Unable to load index pattern, ignore error as the index patterns are only used to
          // configure the filter and query bar - there is still a good chance to get the visualization
          // to show.
          return null;
        }
      }
    );
    const indexPatterns = (
      await Promise.all(promises)
    ).filter((indexPattern: IndexPattern | null): indexPattern is IndexPattern =>
      Boolean(indexPattern)
    );

    return new Embeddable(
      this.timefilter,
      this.expressionRenderer,
      {
        savedVis,
        editUrl: this.coreHttp.basePath.prepend(getEditPath(savedObjectId)),
        editable: this.isEditable(),
        indexPatterns,
      },
      input,
      parent
    );
  }

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}
