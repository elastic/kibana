import { pkg } from './package_json';
import { resolve } from 'path';

export function fromRoot(...args) {
  return resolve(pkg.__dirname, ...args);
}
