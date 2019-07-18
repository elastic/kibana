/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Chrome } from 'ui/chrome';

import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import { DataSetup, ExpressionRenderer } from 'src/legacy/core_plugins/data/public';
import {
  EmbeddableFactory as AbstractEmbeddableFactory,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { Embeddable } from './embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from '../../persistence';
import { getEditPath } from '../../../common';

export class EmbeddableFactory extends AbstractEmbeddableFactory {
  type = DOC_TYPE;

  private chrome: Chrome;
  private indexPatternService: DataSetup['indexPatterns']['indexPatterns'];
  private expressionRenderer: ExpressionRenderer;

  constructor(
    chrome: Chrome,
    expressionRenderer: ExpressionRenderer,
    indexPatternService: DataSetup['indexPatterns']
  ) {
    super({
      savedObjectMetaData: {
        name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
          defaultMessage: 'Lens Visualization',
        }),
        type: DOC_TYPE,
        getIconForSavedObject: () => 'faceHappy',
      },
    });
    this.chrome = chrome;
    this.indexPatternService = indexPatternService.indexPatterns;
    this.expressionRenderer = expressionRenderer;
  }

  public isEditable() {
    return capabilities.get().lens.save as boolean;
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
    const store = new SavedObjectIndexStore(this.chrome.getSavedObjectsClient());
    const savedVis = await store.load(savedObjectId);

    const promises = savedVis.state.datasourceMetaData.filterableIndexPatterns.map(
      async indexPatternId => {
        try {
          return await this.indexPatternService.get(indexPatternId);
        } catch (error) {
          // Unable to load index pattern, better to not throw error so map embeddable can render
          // Error will be surfaced by map embeddable since it too will be unable to locate the index pattern
          return null;
        }
      }
    );
    const indexPatterns = (await Promise.all(promises)).filter(indexPattern =>
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
      parent
    );
  }

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}
