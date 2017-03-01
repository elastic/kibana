import { Transform } from 'stream';

/**
 *  Creates a Transform stream that consumes a stream of Buffers
 *  and produces a stream of strings (in object mode) by splitting
 *  the received bytes using the splitChunk.
 *
 *  Ways this is behaves like String#split:
 *    - instances of splitChunk are removed from the input
 *    - splitChunk can be on any size
 *    - if there are no bytes found after the last splitChunk
 *      a final empty chunk is emitted
 *
 *  Ways this deviates from String#split:
 *    - splitChunk cannot be a regexp
 *    - an empty string or Buffer will not produce a stream of individual
 *      bytes like `string.split('')` would
 *
 *  @param  {String} splitChunk
 *  @return {Transform}
 */
export function createSplitStream(splitChunk) {
  let unsplitBuffer = Buffer.alloc(0);

  return new Transform({
    writableObjectMode: false,
    readableObjectMode: true,
    transform(chunk, enc, callback) {
      try {
        let i;
        let toSplit = Buffer.concat([unsplitBuffer, chunk]);
        while ((i = toSplit.indexOf(splitChunk)) !== -1) {
          const slice = toSplit.slice(0, i);
          toSplit = toSplit.slice(i + splitChunk.length);
          this.push(slice.toString('utf8'));
        }

        unsplitBuffer = toSplit;
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    flush(callback) {
      try {
        this.push(unsplitBuffer.toString('utf8'));

        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
