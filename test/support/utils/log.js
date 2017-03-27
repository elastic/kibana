
import moment from 'moment';
import util from 'util';

import {
  config
} from '../index';

class Log {

  log(...args) {
    console.log(moment().format('HH:mm:ss.SSS') + ':', util.format(...args));
  }

  info(...args) {
    this.log('INFO', util.format(...args));
  }

  error(...args) {
    this.log('ERROR', util.format(...args));
  }

  debug(...args) {
    if (config.debug) this.log(...args);
  }

}

export default new Log();
