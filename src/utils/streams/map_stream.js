import { Transform } from 'stream';

export function createMapStream(fn) {
  let i = 0;

  return new Transform({
    objectMode: true,
    async transform(value, enc, done) {
      try {
        this.push(await fn(value, i++));
        done();
      } catch (err) {
        done(err);
      }
    }
  });
}
