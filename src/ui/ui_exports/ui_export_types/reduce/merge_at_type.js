import { createTypeReducer } from './lib';

export const mergeAtType = createTypeReducer((a, b) => ({
  ...a,
  ...b
}));
