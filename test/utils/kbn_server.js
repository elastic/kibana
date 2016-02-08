import { defaultsDeep, set } from 'lodash';
import requirefrom from 'requirefrom';
import { header as basicAuthHeader } from './base_auth';
import { kibanaUser, kibanaServer } from '../shield';

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
    username: kibanaServer.username,
    password: kibanaServer.password
  }
};

/**
 * Creates an instance of KbnServer with default configuration
 * tailored for unit tests
 *
 * @param {object} params Any config overrides for this instance
 */
export function createServer(params = {}) {
  params = defaultsDeep({}, params, SERVER_DEFAULTS);
  return new KbnServer(params);
};

/**
 * Creates request configuration with a basic auth header
 */
export function authOptions() {
  const { username, password } = kibanaUser;
  const authHeader = basicAuthHeader(username, password);
  return set({}, 'headers.Authorization', authHeader);
};

/**
 * Makes a request with test headers via hapi server inject()
 *
 * The given options are decorated with default testing options, so it's
 * recommended to use this function instead of using inject() directly whenever
 * possible throughout the tests.
 *
 * @param {KbnServer} kbnServer
 * @param {object}    options Any additional options or overrides for inject()
 * @param {Function}  fn The callback to pass as the second arg to inject()
 */
export function makeRequest(kbnServer, options, fn) {
  options = defaultsDeep({}, authOptions(), options);
  return kbnServer.server.inject(options, fn);
};
