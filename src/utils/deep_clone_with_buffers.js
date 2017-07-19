import { cloneDeep } from 'lodash';

function cloneBuffersCustomizer(val) {
  if (Buffer.isBuffer(val)) {
    return new Buffer(val);
  }
}

export function deepCloneWithBuffers(vals) {
  return cloneDeep(vals, cloneBuffersCustomizer);
}
