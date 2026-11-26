/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type FocusRunAs = () => void;

let focusRunAs: FocusRunAs | undefined;

/** The YAML editor registers this so Share page can jump to `settings.run_as`. */
export const registerFocusRunAs = (focus: FocusRunAs): (() => void) => {
  focusRunAs = focus;
  return () => {
    if (focusRunAs === focus) focusRunAs = undefined;
  };
};

export const focusRunAsSetting = (): void => {
  focusRunAs?.();
};
