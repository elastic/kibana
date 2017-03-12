import { cloneDeep } from 'lodash';

function cloneBuffersCustomizer(val) {
  if (Buffer.isBuffer(val)) {
    return new Buffer(val);
  }
}

export default function (vals) {
  return cloneDeep(vals, cloneBuffersCustomizer);
}
