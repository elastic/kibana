/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

export type MapSavedObjectAttributes = {
  title?: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
  bounds?: {
    type?: string;
    coordinates?: [];
  };
};

export type MapSavedObject = {
  [key: string]: any;
  title: string;
  id?: string;
  type?: string;
  attributes?: MapSavedObjectAttributes;
};
