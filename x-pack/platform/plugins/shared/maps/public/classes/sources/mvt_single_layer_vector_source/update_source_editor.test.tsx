/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../kibana_services', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { UpdateSourceEditor } from './update_source_editor';
import { MVTSingleLayerVectorSource } from './mvt_single_layer_vector_source';
import type { TiledSingleLayerVectorSourceDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';

const descriptor: TiledSingleLayerVectorSourceDescriptor = {
  type: SOURCE_TYPES.MVT_SINGLE_LAYER,
  url_template: 'https://example.com/{x}/{y}/{z}.pbf',
  layer_name: 'foobar',
  min_source_zoom: 4,
  max_source_zoom: 14,
  fields: [],
  tooltip_properties: [],
};

test('should render update source editor (fields _should_ be included)', async () => {
  const source = new MVTSingleLayerVectorSource(descriptor);

  const component = shallow(
    <UpdateSourceEditor source={source} tooltipFields={[]} onChange={() => {}} />
  );

  expect(component).toMatchSnapshot();
});
