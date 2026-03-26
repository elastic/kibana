/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { InvestigationGuideEditor } from './rule_investigation_guide_editor';
import { userEvent } from '@testing-library/user-event';

const render = (toRender: any) => rtlRender(toRender, { wrapper: IntlProvider });

describe('RuleInvestigationGuide', () => {
  it('should render the investigation guide when provided', () => {
    const setRuleParams = jest.fn();
    render(<InvestigationGuideEditor setRuleParams={setRuleParams} value="123" />);
    const editorElement = screen.getByLabelText(
      'Add guidelines for addressing alerts created by this rule'
    );
    expect(editorElement).toBeInTheDocument();
  });

  it('should call setRuleParams when the value changes', async () => {
    const setRuleParams = jest.fn();
    render(<InvestigationGuideEditor setRuleParams={setRuleParams} value="# Markdown Summary" />);
    const editorElement = screen.getByLabelText(
      'Add guidelines for addressing alerts created by this rule'
    );
    expect(editorElement).toBeInTheDocument();
    expect(editorElement).toHaveValue('# Markdown Summary');
    expect(setRuleParams).toHaveBeenCalledTimes(0);

    await userEvent.type(editorElement!, '!');

    expect(setRuleParams).toHaveBeenCalled();
    expect(setRuleParams.mock.calls[0]).toHaveLength(1);
    expect(setRuleParams.mock.calls[0][0]).toEqual({
      investigation_guide: { blob: '# Markdown Summary!' },
    });
  });
});
