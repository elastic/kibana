/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { MAP_SAVED_OBJECT_TYPE } from '../../../maps/common/constants';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../../../src/legacy/core_plugins/visualizations/public/embeddable/constants';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../../src/legacy/core_plugins/kibana/public/discover/embeddable/constants';

export const EmbeddableTypes = {
  map: MAP_SAVED_OBJECT_TYPE,
  search: SEARCH_EMBEDDABLE_TYPE,
  visualization: VISUALIZE_EMBEDDABLE_TYPE,
};
