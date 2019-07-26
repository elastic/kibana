/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

class MockMbMap {

  constructor(style) {
    this._style = style;
  }

  getStyle() {
    return this._style;
  }

}


class MockLayer {

  constructor(sourceId, layerIds) {
    this._sourceIds = sourceIds;
    this._layerIds = layerIds;
  }


}

describe('mb/utils', () => {

  test('should remove orphaned sources and layers', async () => {
    expect(true).toBe(false);
  });


});
