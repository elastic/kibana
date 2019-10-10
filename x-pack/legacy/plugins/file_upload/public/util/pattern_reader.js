/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const oboe = require('oboe');


export class PatternReader {

  constructor() {
    this.oboeStream = oboe();
  }

  onGeoJSONFeaturePatternDetect = featureDetectCallback => {
    this.oboeStream.node({
      'features.*': feature => featureDetectCallback(feature)
    });
  }

  writeDataToPatternStream = data => this.oboeStream.emit('data', data);

  abortStream = () => this.oboeStream.abort();

  onStreamComplete =
    streamCompleteCallback => this.oboeStream.done(
      finalParsedJson => streamCompleteCallback(finalParsedJson)
    );
}
