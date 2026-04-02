/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RecoveryPolicy } from './recovery_policy';
import type { RuleApiResponse } from '../../services/rules_api';

const wrap = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RecoveryPolicy', () => {
  it('renders placeholder when recoveryPolicy is undefined', () => {
    const { container } = wrap(<RecoveryPolicy recoveryPolicy={undefined} />);
    expect(container).toHaveTextContent('-');
  });

  it('renders type label for no_breach policy without query', () => {
    const policy: RuleApiResponse['recovery_policy'] = { type: 'no_breach' };
    const { container } = wrap(<RecoveryPolicy recoveryPolicy={policy} />);
    expect(container).toHaveTextContent('No breach');
  });

  it('renders type label and code block for query policy with base query', () => {
    const policy: RuleApiResponse['recovery_policy'] = {
      type: 'query',
      query: { base: 'FROM logs-* | WHERE status = "ok"' },
    };
    wrap(<RecoveryPolicy recoveryPolicy={policy} />);
    expect(screen.getByText('ESQL recovery query')).toBeInTheDocument();
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryQueryBase')).toHaveTextContent(
      'FROM logs-* | WHERE status = "ok"'
    );
  });

  it('renders only type label for query policy without actual queries', () => {
    const policy: RuleApiResponse['recovery_policy'] = { type: 'query' };
    const { container } = wrap(<RecoveryPolicy recoveryPolicy={policy} />);
    expect(container).toHaveTextContent('ESQL recovery query');
    expect(screen.queryByTestId('alertingV2RuleDetailsRecoveryQueryBase')).not.toBeInTheDocument();
  });

  it('falls back to raw type value for unknown types', () => {
    const policy = { type: 'custom_recovery' } as unknown as RuleApiResponse['recovery_policy'];
    const { container } = wrap(<RecoveryPolicy recoveryPolicy={policy} />);
    expect(container).toHaveTextContent('custom_recovery');
  });
});
