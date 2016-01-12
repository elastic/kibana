import { defaultsDeep, set } from 'lodash';
import requirefrom from 'requirefrom';
import { header as basicAuthHeader } from './base_auth';

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
    url: 'http://localhost:9210',
    username: 'kibana',
    password: 'notsecure'
  }
};

export function createServer(params = {}) {
  params = defaultsDeep({}, params, SERVER_DEFAULTS);
  return new KbnServer(params);
};

export function authOptions() {
  const authHeader = basicAuthHeader('user', 'notsecure');
  return set({}, 'headers.Authorization', authHeader);
};

export function makeRequest(kbnServer, options, fn) {
  options = defaultsDeep({}, authOptions(), options);
  return kbnServer.server.inject(options, fn);
};
