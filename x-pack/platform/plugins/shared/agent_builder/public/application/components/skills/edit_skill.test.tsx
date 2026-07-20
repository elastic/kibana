/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditSkill } from './edit_skill';
import { SkillFormMode } from './skill_form';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ skillId: 'skill-1' }),
  Redirect: () => <div data-test-subj="redirect" />,
}));

jest.mock('../../hooks/skills/use_edit_skill');
jest.mock('../../hooks/use_ui_privileges');

// Render the SkillForm as a lightweight stub that surfaces the `mode` prop so the test can assert
// whether EditSkill chose the editable or read-only variant.
jest.mock('./skill_form', () => {
  const actual = jest.requireActual('./skill_form');
  return {
    SkillFormMode: actual.SkillFormMode,
    SkillForm: ({ mode }: { mode: string }) => <div data-test-subj={`skillForm-${mode}`} />,
  };
});

const { useEditSkill } = jest.requireMock('../../hooks/skills/use_edit_skill');
const { useUiPrivileges } = jest.requireMock('../../hooks/use_ui_privileges');

describe('EditSkill', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useEditSkill.mockReturnValue({
      skill: { id: 'skill-1', name: 'Skill 1', readonly: false },
      isSubmitting: false,
      isLoading: false,
      editSkill: jest.fn(),
    });

    useUiPrivileges.mockReturnValue({ manageSkills: true });
  });

  it('renders the editable form when the user has the manageSkills privilege', () => {
    render(<EditSkill />);
    expect(screen.getByTestId(`skillForm-${SkillFormMode.Edit}`)).toBeInTheDocument();
  });

  it('renders the read-only form when the user lacks the manageSkills privilege', () => {
    useUiPrivileges.mockReturnValue({ manageSkills: false });
    render(<EditSkill />);
    expect(screen.getByTestId(`skillForm-${SkillFormMode.View}`)).toBeInTheDocument();
  });

  it('renders the read-only form for a built-in (readonly) skill even with the privilege', () => {
    useEditSkill.mockReturnValue({
      skill: { id: 'skill-1', name: 'Skill 1', readonly: true },
      isSubmitting: false,
      isLoading: false,
      editSkill: jest.fn(),
    });
    render(<EditSkill />);
    expect(screen.getByTestId(`skillForm-${SkillFormMode.View}`)).toBeInTheDocument();
  });
});
