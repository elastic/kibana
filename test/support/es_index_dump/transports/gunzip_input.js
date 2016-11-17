import { createGunzip } from 'zlib';
import { file as EsDumpFileTransport } from 'elasticdump/lib/transports/file';

const $rawDataStream = Symbol('raw file data stream');

/**
 *  Extends elasticdump's "file" transport to support gzip-compressed input files
 *
 *  How:
 *   - extend the default EsDumpFileTransport
 *   - intercept the assignment of the FileTransport's metaStream (which emits
 *      raw data from the file)
 *   - pipe the raw-data stream to a gunzip stream
 *   - expose the gunzip stream as FileTransport#metaStream
 *   - EsDumpFileTransport transparently receives uncompressed data
 *
 *  Pairs with the GzipOutputTransport in ./gzip_output
 */
export class GunzipInputTransport extends EsDumpFileTransport {
  get metaStream() {
    return this[$rawDataStream];
  }

  set metaStream(s) {
    if (!s) {
      this[$rawDataStream] = s;
      return s;
    }

    this[$rawDataStream] = createGunzip();
    s.pipe(this[$rawDataStream]);
    return this[$rawDataStream];
  }
}
