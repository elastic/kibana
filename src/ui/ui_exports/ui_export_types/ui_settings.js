import { mergeAtType } from './reduce';
import { wrap, uniqueKeys } from './modify_reduce';

export const uiSettingDefaults = wrap(uniqueKeys(), mergeAtType);
