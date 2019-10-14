/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const oboe = require('oboe');


export class PatternReader {

  constructor({ onFeatureDetect, onStreamComplete }) {
    this._oboeStream = oboe();
    this._onGeoJSONFeaturePatternDetect(onFeatureDetect);
    this._onStreamComplete(onStreamComplete);
  }

  _onGeoJSONFeaturePatternDetect = featureDetectCallback => {
    this._oboeStream.node({
      'features.*': feature => featureDetectCallback(feature),
      // Handle single feature files
      '!.geometry': (geom, path, ancestors) => {
        const feature = ancestors[0];
        const { geometry } = featureDetectCallback(feature);
        return geometry;
      }
    });
  }

  _onStreamComplete(streamCompleteCallback) {
    this._oboeStream.done(streamCompleteCallback);
  }

  writeDataToPatternStream(data) {
    this._oboeStream.emit('data', data);
  }

  abortStream() {
    this._oboeStream.abort();
  }

}
