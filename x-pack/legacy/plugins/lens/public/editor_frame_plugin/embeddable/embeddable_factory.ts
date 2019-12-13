/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Chrome } from 'ui/chrome';

import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import { IndexPatternsContract, IndexPattern } from '../../../../../../../src/plugins/data/public';
import { ExpressionRenderer } from '../../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactory as AbstractEmbeddableFactory,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
  EmbeddableHandlers,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { Embeddable } from './embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from '../../persistence';
import { getEditPath } from '../../../common';

export class EmbeddableFactory extends AbstractEmbeddableFactory {
  type = DOC_TYPE;

  private chrome: Chrome;
  private indexPatternService: IndexPatternsContract;
  private expressionRenderer: ExpressionRenderer;

  constructor(
    chrome: Chrome,
    expressionRenderer: ExpressionRenderer,
    indexPatternService: IndexPatternsContract
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
    this.chrome = chrome;
    this.expressionRenderer = expressionRenderer;
    this.indexPatternService = indexPatternService;
  }

  public isEditable() {
    return capabilities.get().visualize.save as boolean;
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
    handlers: EmbeddableHandlers
  ) {
    const store = new SavedObjectIndexStore(this.chrome.getSavedObjectsClient());
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
      this.expressionRenderer,
      {
        savedVis,
        editUrl: this.chrome.addBasePath(getEditPath(savedObjectId)),
        editable: this.isEditable(),
        indexPatterns,
      },
      input,
      {
        ...handlers,
        createSearchCollector: this.createSearchCollector,
      }
    );
  }

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}
