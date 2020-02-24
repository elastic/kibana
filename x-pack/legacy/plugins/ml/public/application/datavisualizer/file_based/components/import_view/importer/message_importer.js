/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Importer } from './importer';

export class MessageImporter extends Importer {
  constructor(results, settings) {
    super(settings);

    this.excludeLinesRegex =
      results.exclude_lines_pattern === undefined
        ? null
        : new RegExp(results.exclude_lines_pattern);
    this.multilineStartRegex =
      results.multiline_start_pattern === undefined
        ? null
        : new RegExp(results.multiline_start_pattern);
  }

  // split the text into an array of lines by looking for newlines.
  // any lines that match the exclude_lines_pattern regex are ignored.
  // if a newline is found, check the next line to see if it starts with the
  // multiline_start_pattern regex
  // if it does, it is a legitimate end of line and can be pushed into the list,
  // if not, it must be a newline char inside a field value, so keep looking.
  read(text) {
    try {
      const data = [];

      let message = '';
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
          message = this.processLine(data, message, line);
          line = '';
        } else {
          line += char;
        }
      }

      // the last line may have been missing a newline ending
      if (line !== '') {
        message = this.processLine(data, message, line);
      }

      // add the last message to the list if not already done
      if (message !== '') {
        this.addMessage(data, message);
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

  processLine(data, message, line) {
    if (this.excludeLinesRegex === null || line.match(this.excludeLinesRegex) === null) {
      if (this.multilineStartRegex === null || line.match(this.multilineStartRegex) !== null) {
        this.addMessage(data, message);
        message = '';
      } else {
        message += '\n';
      }
      message += line;
    }
    return message;
  }

  addMessage(data, message) {
    // if the message ended \r\n (Windows line endings)
    // then omit the \r as well as the \n for consistency
    message = message.replace(/\r$/, '');
    data.push({ message });
  }
}
