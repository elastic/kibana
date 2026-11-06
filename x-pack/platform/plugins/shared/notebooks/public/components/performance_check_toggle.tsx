/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { EuiBadge, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const LABEL = i18n.translate('xpack.notebook.performanceCheck.label', {
  defaultMessage: 'Performance',
});

const TOOLTIP = i18n.translate('xpack.notebook.performanceCheck.tooltip', {
  defaultMessage: 'Toggle notebook performance UI',
});

const ARIA_LABEL = i18n.translate('xpack.notebook.performanceCheck.toggle', {
  defaultMessage: 'Toggle notebook performance check',
});

/** Toggles the notebook performance check from the developer toolbar. */
export const PerformanceCheckToggle = ({ enabled$ }: { enabled$: BehaviorSubject<boolean> }) => {
  const { euiTheme } = useEuiTheme();
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
        <span
          css={css`
            display: inline-flex;
            align-items: center;
            gap: ${euiTheme.size.xs};
          `}
        >
          <EuiIcon type="dot" size="s" color={enabled ? 'success' : 'danger'} aria-hidden={true} />
          {LABEL}
        </span>
      </EuiBadge>
    </EuiToolTip>
  );
};
