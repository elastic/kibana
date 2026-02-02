/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFocusTrapProps } from '@elastic/eui';
import { useMemo } from 'react';

export const useFocusButtonTrap = (
  focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>
) => {
  const focusTrapProps: Pick<EuiFocusTrapProps, 'returnFocus'> = useMemo(
    () => ({
      returnFocus() {
        if (focusButtonRef && 'current' in focusButtonRef && focusButtonRef.current) {
          focusButtonRef.current.focus();
          return false;
        }
        return true;
      },
    }),
    [focusButtonRef]
  );

  return focusTrapProps;
};
