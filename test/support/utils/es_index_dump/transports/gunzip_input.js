import { createGunzip } from 'zlib';
import { file as EsDumpFileTransport } from 'elasticdump/lib/transports/file';

const $stream = Symbol('stream');

export class GunzipInputTransport extends EsDumpFileTransport {
  get metaStream() {
    return this[$stream];
  }

  set metaStream(s) {
    if (!s) {
      this[$stream] = s;
      return s;
    }

    this[$stream] = createGunzip();
    s.pipe(this[$stream]);
    return this[$stream];
  }
}
