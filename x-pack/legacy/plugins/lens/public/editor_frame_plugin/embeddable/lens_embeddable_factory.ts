/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { data } from '../../../../../../../src/legacy/core_plugins/data/public/setup';

export const indexPatternService = data.indexPatterns.indexPatterns;
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactory,
  embeddableFactories,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { LensEmbeddable } from './lens_embeddable';
import { SavedObjectIndexStore, DOC_TYPE } from '../../persistence';
import { indexPatternDatasourceSetup } from '../../indexpattern_plugin';
import { xyVisualizationSetup } from '../../xy_visualization_plugin';
import { editorFrameSetup } from '../../editor_frame_plugin';
import { datatableVisualizationSetup } from '../../datatable_visualization_plugin';
import { getEditPath } from '../../../common';

// bootstrap shimmed plugins to register everything necessary to the expression.
// the new platform will take care of this once in place
indexPatternDatasourceSetup();
datatableVisualizationSetup();
xyVisualizationSetup();
editorFrameSetup();

export class LensEmbeddableFactory extends EmbeddableFactory {
  type = DOC_TYPE;

  constructor() {
    super({
      savedObjectMetaData: {
        name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
          defaultMessage: 'Lens Visualization',
        }),
        type: DOC_TYPE,
        getIconForSavedObject: () => 'faceHappy',
      },
    });
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
    const store = new SavedObjectIndexStore(chrome.getSavedObjectsClient());
    const savedVis = await store.load(savedObjectId);

    const promises = savedVis.state.datasourceMetaData.filterableIndexPatterns.map(async (indexPatternId) => {
      try {
        return await indexPatternService.get(indexPatternId);
      } catch (error) {
        // Unable to load index pattern, better to not throw error so map embeddable can render
        // Error will be surfaced by map embeddable since it too will be unable to locate the index pattern
        return null;
      }
    });
    const indexPatterns = await Promise.all(promises);

    return new LensEmbeddable(
      {
        savedVis,
        editUrl: chrome.addBasePath(getEditPath(savedObjectId)),
        editable: this.isEditable(),
        indexPatterns
      },
      input,
      parent
    );
  }

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}

embeddableFactories.set('lens', new LensEmbeddableFactory());
