/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiBadge, EuiHealth, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const LABEL = i18n.translate('xpack.notebook.performanceCheck.label', {
  defaultMessage: 'Performance',
});

const TOOLTIP = i18n.translate('xpack.notebook.performanceCheck.tooltip', {
  defaultMessage: 'Click to toggle the notebook performance check.',
});

const ARIA_LABEL = i18n.translate('xpack.notebook.performanceCheck.toggle', {
  defaultMessage: 'Toggle notebook performance check',
});

/** Toggles the notebook performance check from the developer toolbar. */
export const PerformanceCheckToggle = ({ enabled$ }: { enabled$: BehaviorSubject<boolean> }) => {
  const enabled = useObservable(enabled$, enabled$.getValue());
  return (
    <EuiToolTip content={TOOLTIP}>
      <EuiBadge
        color="hollow"
        onClick={() => enabled$.next(!enabled)}
        onClickAriaLabel={ARIA_LABEL}
        aria-pressed={enabled}
        data-test-subj="notebookPerformanceCheckToggle"
      >
        <EuiHealth color={enabled ? 'success' : 'danger'} textSize="xs">
          {LABEL}
        </EuiHealth>
      </EuiBadge>
    </EuiToolTip>
  );
};
