/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { Importer } from './importer';

export class SstImporter extends Importer {
  constructor(results, settings) {
    super(settings);

    this.format = results.format;
    this.multilineStartPattern = results.multiline_start_pattern;
    this.grokPattern = results.grok_pattern;
  }

  // convert the semi structured text string into an array of lines
  // by looking over each char, looking for newlines.
  // if one is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a new line char inside a field value, so keep looking.
  async read(text) {
    try {
      const data = [];

      let message = '';
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          if (line.match(this.multilineStartPattern) !== null) {
            data.push({ message });
            message = '';
          } else {
            message += char;
          }
          message += line;
          line = '';
        } else {
          line += char;
        }
      }

      // add the last line of the file to the list
      if (message !== '') {
        data.push({ message });
      }

      // remove first line if it is blank
      if (data[0] && data[0].message === '') {
        data.shift();
      }

      this.data = data;
      this.docArray = this.data;

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error,
      };
    }
  }
}
