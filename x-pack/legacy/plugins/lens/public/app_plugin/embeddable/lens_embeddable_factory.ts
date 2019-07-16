/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactory,
  embeddableFactories,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/index';
import { LensEmbeddable } from './lens_embeddable';
import { SavedObjectIndexStore } from '../../persistence';


export class LensEmbeddableFactory extends EmbeddableFactory {
  type = 'lens';

  constructor() {
    super({
      savedObjectMetaData: {
        name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
          defaultMessage: 'Lens Visualization',
        }),
        type: 'lens',
        getIconForSavedObject: () => 'happyFace',
      },
    });
  }
  isEditable() {
    // TODO make it possible
    return false;
  }

  // Not supported yet for maps types.
  canCreateNew() { return false; }

  getDisplayName() {
    return i18n.translate('xpack.lens.embeddableDisplayName', {
      defaultMessage: 'lens',
    });
  }

  async createFromSavedObject(
    savedObjectId: string,
    input: Partial<EmbeddableInput>,
    parent?: IContainer
  ) {
    const store = new SavedObjectIndexStore(chrome.getSavedObjectsClient());
    const savedVis = await store.load(savedObjectId);

    // TODO do I need to pass in edit url stuff?
    return new LensEmbeddable(
      {
        savedVis,
        id: savedObjectId
      },
      input,
      parent
    );
  }

  async create(input: EmbeddableInput) {
        // TODO fix this
    window.location.href = chrome.addBasePath('lens/abc');
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}

embeddableFactories.set('lens', new LensEmbeddableFactory());
