/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { useMarkdownEditorPluginClickedEBT } from './use_markdown_editor_ebt';

jest.mock('../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('useMarkdownEditorPluginClickedEBT', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  it('reports the plugin type with the owner', () => {
    const { result } = renderHook(() => useMarkdownEditorPluginClickedEBT());

    result.current('lens');

    expect(reportEvent).toHaveBeenCalledWith(CASE_MARKDOWN_EDITOR_PLUGIN_CLICKED_EVENT_TYPE, {
      owner: SECURITY_SOLUTION_OWNER,
      plugin_type: 'lens',
    });
  });
});
