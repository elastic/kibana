import { Transform } from 'stream';

/**
 *  Create a Transform stream that receives values in object mode,
 *  and intersperses a chunk between each object received.
 *
 *  This is useful for writing lists:
 *
 *    createListStream(['foo', 'bar'])
 *      .pipe(createIntersperseStream('\n'))
 *      .pipe(process.stdout) // outputs "foo\nbar"
 *
 *  Combine with a concat stream to get "join" like functionality:
 *
 *    await createPromiseFromStreams([
 *      createListStream(['foo', 'bar']),
 *      createIntersperseStream(' '),
 *      createConcatStream()
 *    ]) // produces a single value "foo bar"
 *
 *  @param  {String|Buffer} intersperseChunk
 *  @return {Transform}
 */
export function createIntersperseStream(intersperseChunk) {
  let first = true;

  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(chunk, enc, callback) {
      try {
        if (first) {
          first = false;
        } else {
          this.push(intersperseChunk);
        }

        this.push(chunk);
        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
