import * as functionType from './function';
import * as literal from './literal';
import * as namedArg from './named_arg';
import * as wildcard from './wildcard';

export const nodeTypes = {
  function: functionType,
  literal,
  namedArg,
  wildcard,
};
