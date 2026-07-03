/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { RULE_KIND_ICONS, RULE_KIND_LABELS, RULE_KIND_TOOLTIPS } from '@kbn/alerting-v2-constants';
import type { RuleKind } from '@kbn/alerting-v2-schemas';
import { RuleKindBadge } from './rule_header_description';

const wrap = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('RuleKindBadge', () => {
  it.each<RuleKind>(['alert', 'signal'])('renders the %s kind badge', async (kind) => {
    wrap(<RuleKindBadge kind={kind} />);

    const badge = screen.getByTestId('kindBadge');
    expect(badge).toHaveTextContent(RULE_KIND_LABELS[kind]);
    expect(
      badge.querySelector(`[data-euiicon-type="${RULE_KIND_ICONS[kind]}"]`)
    ).toBeInTheDocument();

    fireEvent.mouseOver(badge);
    await waitFor(() => {
      expect(screen.getByText(RULE_KIND_TOOLTIPS[kind])).toBeInTheDocument();
    });
  });

  it('falls back to the raw kind and a dot icon for an unrecognized kind', () => {
    // Cast intentionally widens the closed union to exercise the `?? kind` / `?? 'dot'`
    // fallback paths, which are unreachable with a well-typed kind.
    wrap(<RuleKindBadge kind={'unknown' as RuleKind} />);

    const badge = screen.getByTestId('kindBadge');
    expect(badge).toHaveTextContent('unknown');
    expect(badge.querySelector('[data-euiicon-type="dot"]')).toBeInTheDocument();
  });
});
