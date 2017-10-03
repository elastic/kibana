import { Transform } from 'stream';

export function createReplaceStream(toReplace, replacement) {
  if (typeof toReplace !== 'string') {
    throw new TypeError('toReplace must be a string');
  }

  let buffer = Buffer.alloc(0);
  return new Transform({
    objectMode: false,
    async transform(value, enc, done) {
      try {
        buffer = Buffer.concat([buffer, value], buffer.length + value.length);

        while (true) {
          const index = buffer.indexOf(toReplace);
          if (index === -1) {
            break;
          }

          this.push(buffer.slice(0, index));
          this.push(replacement);
          buffer = buffer.slice(index + toReplace.length);
        }

        if (buffer.length > toReplace.length) {
          this.push(buffer.slice(0, buffer.length - toReplace.length));
          buffer = buffer.slice(-toReplace.length);
        }

        done();
      } catch (err) {
        done(err);
      }
    },

    flush(callback) {
      if (buffer.length) {
        this.push(buffer);
      }

      buffer = null;
      callback();
    }
  });
}
