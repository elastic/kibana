import { flatConcatAtType } from './reduce';
import { wrap, alias, debug } from './modify_reduce';

export const unknown = wrap(debug, alias('unknown'), flatConcatAtType);
