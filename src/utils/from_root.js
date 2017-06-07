import { resolve } from 'path';

import pkg from './package_json';

export default function fromRoot(...args) {
  return resolve(pkg.__dirname, ...args);
}
