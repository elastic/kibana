/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  HideEscalationInNightshift,
  NIGHTSHIFT_APP_ID_FOR_ESCALATION_HIDE,
} from './hide_escalation_in_nightshift';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderGate = (appId: string | undefined) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        currentAppId$: new BehaviorSubject(appId),
      },
    },
  } as unknown as ReturnType<typeof useKibana>);

  return render(
    <HideEscalationInNightshift>
      <button type="button">Open an escalation</button>
    </HideEscalationInNightshift>
  );
};

describe('HideEscalationInNightshift', () => {
  it('hides the escalation control in the Nightshift app', () => {
    renderGate(NIGHTSHIFT_APP_ID_FOR_ESCALATION_HIDE);

    expect(screen.queryByRole('button', { name: 'Open an escalation' })).not.toBeInTheDocument();
  });

  it('shows the escalation control outside Nightshift (e.g. Alert Zero)', () => {
    renderGate('alertzero');

    expect(screen.getByRole('button', { name: 'Open an escalation' })).toBeInTheDocument();
  });
});
