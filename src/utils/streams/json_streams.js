import { Transform } from 'stream';

/**
 *  Create a Transform stream that accepts strings (in
 *  object mode) and parsed those streams to provide their
 *  JavaScript value.
 *
 *  Parse errors are emitted with the "error" event, and
 *  if not caught will cause the process to crash. When caught
 *  the stream will continue to parse subsequent values.
 *
 *  @return {Transform}
 */
export function createJsonParseStream() {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(json, enc, callback) {
      try {
        callback(null, JSON.parse(json));
      } catch (err) {
        callback(err);
      }
    }
  });
}

/**
 *  Create a Transform stream that accepts arbitrary JavaScript
 *  values, stringifies them, and provides the output in object
 *  mode to consumers.
 *
 *  Serialization errors are emitted with the "error" event, and
 *  if not caught will cause the process to crash. When caught
 *  the stream will continue to stringify subsequent values.
 *
 *  @param  {Object} options
 *  @property {Boolean} options.pretty
 *  @return {Transform}
 */
export function createJsonStringifyStream({ pretty = false } = {}) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform(json, enc, callback) {
      try {
        callback(null, JSON.stringify(json, null, pretty ? 2 : 0));
      } catch (err) {
        callback(err);
      }
    }
  });
}
