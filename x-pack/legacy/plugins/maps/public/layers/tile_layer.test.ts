/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import { EMS_XYZ } from '../../common/constants';
import { IXYZTMSSourceDescriptor } from '../../common/descriptor_types';
import { ITMSSource } from './sources/tms_source';
import { ILayer } from './layer';

const sourceDescriptor: IXYZTMSSourceDescriptor = {
  type: EMS_XYZ,
  urlTemplate: 'https://example.com/{x}/{y}/{z}.png',
  id: 'foobar',
};

class MockTileSource implements ITMSSource {
  private _descriptor: IXYZTMSSourceDescriptor;
  constructor(descriptor: IXYZTMSSourceDescriptor) {
    this._descriptor = descriptor;
  }
  createDefaultLayer(): ILayer {
    throw new Error('not implemented');
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.urlTemplate;
  }

  async getUrlTemplate(): Promise<string> {
    return 'template/{x}/{y}/{z}.png';
  }
}

describe('TileLayer', () => {
  it('should use display-label from source', async () => {
    const source = new MockTileSource(sourceDescriptor);
    const layer: ILayer = new TileLayer({
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor },
    });
    expect(await source.getDisplayName()).toEqual(await layer.getDisplayName());
  });

  it('should override with custom display-label if present', async () => {
    const source = new MockTileSource(sourceDescriptor);
    const layer: ILayer = new TileLayer({
      source,
      layerDescriptor: { id: 'layerid', sourceDescriptor, label: 'custom' },
    });
    expect('custom').toEqual(await layer.getDisplayName());
  });
});
