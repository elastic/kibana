import { createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { file as EsDumpFileTransport } from 'elasticdump/lib/transports/file';

const $stream = Symbol('stream');

export class GzipOutputTransport extends EsDumpFileTransport {
  get stream() {
    return this[$stream];
  }

  set stream(s) {
    if (!s) {
      this[$stream] = s;
      return s;
    }

    this[$stream] = createGzip({
      level: Z_BEST_COMPRESSION
    });
    this[$stream].pipe(s);
    return this[$stream];
  }
}
