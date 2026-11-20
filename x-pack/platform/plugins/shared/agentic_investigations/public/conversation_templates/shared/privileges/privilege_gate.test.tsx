/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { useCanManageInvestigations } from '../../../investigations/hooks/use_can_manage_investigations';
import {
  useCanManageEscalations,
  useCanReadEscalations,
} from '../../../escalations/hooks/use_escalation_privileges';
import { PrivilegeGate, type TemplatePrivilege } from './privilege_gate';

jest.mock('../../../investigations/hooks/use_can_manage_investigations', () => ({
  useCanManageInvestigations: jest.fn(),
}));
jest.mock('../../../escalations/hooks/use_escalation_privileges', () => ({
  useCanManageEscalations: jest.fn(),
  useCanReadEscalations: jest.fn(),
}));

const HOOKS: Record<TemplatePrivilege, jest.Mock> = {
  manageInvestigations: useCanManageInvestigations as jest.Mock,
  manageEscalations: useCanManageEscalations as jest.Mock,
  readEscalations: useCanReadEscalations as jest.Mock,
};

describe('PrivilegeGate', () => {
  beforeEach(() => {
    for (const hook of Object.values(HOOKS)) hook.mockReset().mockReturnValue(false);
  });

  it.each(Object.keys(HOOKS) as TemplatePrivilege[])(
    'renders its children when the user holds %s',
    (privilege) => {
      HOOKS[privilege].mockReturnValue(true);

      render(
        <PrivilegeGate privilege={privilege}>
          <span>allowed</span>
        </PrivilegeGate>
      );

      expect(screen.getByText('allowed')).toBeInTheDocument();
    }
  );

  it('renders nothing while the privilege is missing or unknown', () => {
    const { container } = render(
      <PrivilegeGate privilege="manageEscalations">
        <span>allowed</span>
      </PrivilegeGate>
    );

    expect(container).toBeEmptyDOMElement();
    expect(HOOKS.manageEscalations).toHaveBeenCalled();
    expect(HOOKS.manageInvestigations).not.toHaveBeenCalled();
  });
});
