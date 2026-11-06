/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const TOGGLE_LABEL = i18n.translate('xpack.notebook.performanceCheck.toggle', {
  defaultMessage: 'Notebook performance check',
});

/** Toggles the notebook performance check from the developer toolbar. */
export const PerformanceCheckToggle = ({ enabled$ }: { enabled$: BehaviorSubject<boolean> }) => {
  const enabled = useObservable(enabled$, enabled$.getValue());
  return (
    <EuiToolTip content={TOGGLE_LABEL} position="top" disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="chartLine"
        color="text"
        size="xs"
        isSelected={enabled}
        aria-pressed={enabled}
        aria-label={TOGGLE_LABEL}
        onClick={() => enabled$.next(!enabled)}
        data-test-subj="notebookPerformanceCheckToggle"
      />
    </EuiToolTip>
  );
};
