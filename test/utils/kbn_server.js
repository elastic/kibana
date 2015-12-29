import { defaultsDeep } from 'lodash';
import requirefrom from 'requirefrom';

const src = requirefrom('src');
const KbnServer = src('server/KbnServer');
const fromRoot = src('utils/fromRoot');

const SERVER_DEFAULTS = {
  server: {
    autoListen: false,
    xsrf: {
      disableProtection: true
    }
  },
  logging: {
    quiet: true
  },
  plugins: {
    scanDirs: [
      fromRoot('src/plugins')
    ]
  },
  optimize: {
    enabled: false
  },
  elasticsearch: {
    url: 'http://localhost:9210'
  }
};

export function createServer(params = {}) {
  params = defaultsDeep({}, params, SERVER_DEFAULTS);
  return new KbnServer(params);
};

export function makeRequest(kbnServer, options, fn) {
  return kbnServer.server.inject(options, fn);
};
