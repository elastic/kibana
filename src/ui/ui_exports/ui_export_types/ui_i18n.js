import { flatConcatAtType } from './reduce';
import { wrap, alias } from './modify_reduce';

// paths to translation files
export const translations = wrap(alias('translationPaths'), flatConcatAtType);
