import { createReduceStream } from './';

/**
 *  Creates a Transform stream that consumes all provided
 *  values and concatenates them using each values `concat`
 *  method.
 *
 *  Concatenate strings:
 *    createListStream(['f', 'o', 'o'])
 *      .pipe(createConcatStream())
 *      .on('data', console.log)
 *      // logs "foo"
 *
 *  Concatenate values into an array:
 *    createListStream([1,2,3])
 *      .pipe(createConcatStream([]))
 *      .pipe(createJsonStringifyStream())
 *      .on('data', console.log)
 *      // logs "[1,2,3]"
 *
 *
 *  @param {any} initial The initial value that subsequent
 *                       items will concat with
 *  @return {Transform}
 */
export function createConcatStream(initial) {
  return createReduceStream((acc, chunk) => acc.concat(chunk), initial);
}
