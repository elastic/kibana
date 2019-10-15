/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const oboe = require('oboe');


export class PatternReader {

  constructor({ onFeatureDetect, onStreamComplete }) {
    this._oboeStream = oboe();
    this._registerFeaturePatternHandler(onFeatureDetect);
    this._registerStreamCompleteHandler(onStreamComplete);
  }

  _registerFeaturePatternHandler(featurePatternCallback) {
    this._oboeStream.node({
      'features.*': feature => featurePatternCallback(feature),
      // Handle single feature files
      '!.geometry': (geom, path, ancestors) => {
        const feature = ancestors[0];
        const { geometry } = featurePatternCallback(feature);
        return geometry;
      }
    });
  }

  _registerStreamCompleteHandler(streamCompleteCallback) {
    this._oboeStream.done(streamCompleteCallback);
  }

  writeDataToPatternStream(data) {
    this._oboeStream.emit('data', data);
  }

  abortStream() {
    this._oboeStream.abort();
  }

}
