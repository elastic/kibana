/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Importer } from './importer';

export class NdjsonImporter extends Importer {
  constructor(results, settings) {
    super(settings);
  }

  async read(json) {
    try {
      const splitJson = json.split(/}\s*\n/);

      const ndjson = [];
      for (let i = 0; i < splitJson.length; i++) {
        if (splitJson[i] !== '') {
          // note the extra } at the end of the line, adding back
          // the one that was eaten in the split
          ndjson.push(`${splitJson[i]}}`);
        }
      }

      this.docArray = ndjson;

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}
