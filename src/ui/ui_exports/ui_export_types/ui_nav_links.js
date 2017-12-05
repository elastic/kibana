import { flatConcatAtType } from './reduce';
import { wrap, alias } from './modify_reduce';

export const links = wrap(alias('navLinkSpecs'), flatConcatAtType);
export const link = wrap(alias('navLinkSpecs'), flatConcatAtType);
