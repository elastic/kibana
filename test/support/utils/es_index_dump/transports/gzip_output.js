import { createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { file as EsDumpFileTransport } from 'elasticdump/lib/transports/file';

const $rawDataStream = Symbol('raw file data stream');

/**
 *  Extends elasticdump's "file" transport to support gzip-compressed output files
 *
 *  How:
 *   - extend the default EsDumpFileTransport
 *   - intercept the assignment of the FileTransport's stream property (which emits
 *      raw file data to be written to disk)
 *   - pipe the raw-data stream to a gzip stream
 *   - expose the gzip stream as FileTransport#stream
 *   - EsDumpFileTransport transparently receives gziped data that it writes to disk
 *
 *  Pairs with the GunzipInputTransport in ./gunzip_input
 */
export class GzipOutputTransport extends EsDumpFileTransport {
  get stream() {
    return this[$rawDataStream];
  }

  set stream(s) {
    if (!s) {
      this[$rawDataStream] = s;
      return s;
    }

    this[$rawDataStream] = createGzip({
      level: Z_BEST_COMPRESSION
    });
    this[$rawDataStream].pipe(s);
    return this[$rawDataStream];
  }
}
