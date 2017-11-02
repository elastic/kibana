import { concat } from './reduce';
import { wrap, alias } from './modify_reduce';

export const links = wrap(alias('navLinkSpecs'), concat);
export const link = wrap(alias('navLinkSpecs'), concat);
