import { format } from 'util';
import { PassThrough } from 'stream';

import { createLogLevelFlags } from './log_levels';
import { magenta, yellow, red, blue, brightBlack } from 'ansicolors';

export function createToolingLog(logLevel = 'silent') {
  const logLevelFlags = createLogLevelFlags(logLevel);

  let indentString = '';

  class ToolingLog extends PassThrough {
    verbose(...args) {
      if (!logLevelFlags.verbose) return;
      this.write(' %s ', magenta('sill'), format(...args));
    }

    debug(...args) {
      if (!logLevelFlags.debug) return;
      this.write(' %s ', brightBlack('debg'), format(...args));
    }

    info(...args) {
      if (!logLevelFlags.info) return;
      this.write(' %s ', blue('info'), format(...args));
    }

    warning(...args) {
      if (!logLevelFlags.warning) return;
      this.write(' %s ', yellow('warn'), format(...args));
    }

    error(err) {
      if (!logLevelFlags.error) return;

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
