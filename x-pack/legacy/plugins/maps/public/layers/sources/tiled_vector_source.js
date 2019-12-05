/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractSource } from './source';
import {ES_GEO_GRID} from "../../../common/constants";
import {i18n} from "@kbn/i18n";
import uuid from "uuid/v4";
import {GRID_RESOLUTION} from "../grid_resolution";
import {CreateSourceEditor} from "./es_geo_grid_source/create_source_editor";
import {UpdateSourceEditor} from "./es_geo_grid_source/update_source_editor";
import React from "react";

export class TiledVectorSource extends AbstractSource {

  static type = 'TiledVectorSource';
  static title = i18n.translate('xpack.maps.source.tiledVectorTitle', {
    defaultMessage: 'Tiled vector'
  });
  static description = i18n.translate('xpack.maps.source.tiledVectorDescription', {
    defaultMessage: 'Tiled vector with url template'
  });

  static icon = 'logoElasticsearch';


  static createDescriptor({ urlTemplate }) {
    return {
      type: TiledVectorSource.type,
      id: uuid(),
      urlTemplate
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    return null;
  }

  renderSourceSettingsEditor({ onChange }) {
    return null;
  }

  async getUrlTemplate() {
    const indexName = 'parcels';
    const geometryName = 'geometry';
    return `http://localhost:8080/?x={x}&y={y}&z={z}&index=${indexName}&geometry=${geometryName}`;

  }
}
