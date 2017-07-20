import { format } from 'util';
import { PassThrough } from 'stream';

import { magenta, yellow, red, blue, brightBlack } from 'ansicolors';

import { parseLogLevel } from './log_levels';

export function createToolingLog(initialLogLevelName = 'silent') {
  // current log level (see logLevel.name and logLevel.flags) changed
  // with ToolingLog#setLevel(newLogLevelName);
  let logLevel = parseLogLevel(initialLogLevelName);

  // current indentation level, changed with ToolingLog#indent(delta)
  let indentString = '';

  class ToolingLog extends PassThrough {
    constructor() {
      super({ objectMode: true });
    }

    verbose(...args) {
      if (!logLevel.flags.verbose) return;
      this.write(' %s ', magenta('sill'), format(...args));
    }

    debug(...args) {
      if (!logLevel.flags.debug) return;
      this.write(' %s ', brightBlack('debg'), format(...args));
    }

    info(...args) {
      if (!logLevel.flags.info) return;
      this.write(' %s ', blue('info'), format(...args));
    }

    warning(...args) {
      if (!logLevel.flags.warning) return;
      this.write(' %s ', yellow('warn'), format(...args));
    }

    error(err) {
      if (!logLevel.flags.error) return;

      if (typeof err !== 'string' && !(err instanceof Error)) {
        err = new Error(`"${err}" thrown`);
      }

      this.write('%s ', red('ERROR'), err.stack || err.message || err);
    }

    indent(delta = 0) {
      const width = Math.max(0, indentString.length + delta);
      indentString = ' '.repeat(width);
      return indentString.length;
    }

    getLevel() {
      return logLevel.name;
    }

    setLevel(newLogLevelName) {
      logLevel = parseLogLevel(newLogLevelName);
    }

    write(...args) {
      format(...args).split('\n').forEach((line, i) => {
        const subLineIndent = i === 0 ? '' : '       ';
        const indent = !indentString ? '' : indentString.slice(0, -1) + (i === 0 && line[0] === '-' ? '└' : '│');
        super.write(`${indent}${subLineIndent}${line}\n`);
      });
    }
  }

  return new ToolingLog();
}
