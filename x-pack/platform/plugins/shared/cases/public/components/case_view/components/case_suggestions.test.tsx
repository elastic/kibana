/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CaseSuggestions } from './case_suggestions';
import { caseData } from '../mocks';
import { renderWithTestingProviders } from '../../../common/mock';
import userEvent from '@testing-library/user-event';
import { useCasesToast } from '../../../common/use_cases_toast';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import * as ReactQuery from '@tanstack/react-query';

jest.mock('../../cases_context/use_cases_context');
jest.mock('../../../common/use_cases_toast');
jest.mock('../../../containers/use_create_attachments', () => ({
  useCreateAttachments: jest.fn(),
}));

let useQueryMock: jest.SpyInstance;
const useCasesContextMock = useCasesContext as jest.Mock;
const useCasesToastMock = useCasesToast as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const MOCK_COMPONENT_ID = 'test-component-id';

const MOCK_SUGGESTION_1 = {
  id: 's1',
  componentId: MOCK_COMPONENT_ID,
  description: 'desc1',
  data: [],
};
const MOCK_SUGGESTION_2 = {
  id: 's2',
  componentId: MOCK_COMPONENT_ID,
  description: 'desc2',
  data: [],
};
const MOCK_SUGGESTION_3 = {
  id: 's3',
  componentId: MOCK_COMPONENT_ID,
  description: 'desc3',
  data: [],
};

const MOCK_INJECTED_COMPONENT_DATA_TEST_SUBJ = 'injected-component';

describe('CaseSuggestions component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryMock = jest.spyOn(ReactQuery, 'useQuery');

    useCasesContextMock.mockReturnValue({
      attachmentSuggestionRegistry: {
        list: () => [
          {
            id: MOCK_COMPONENT_ID,
            children: ({ suggestion: s }: { suggestion: typeof MOCK_SUGGESTION_1 }) => (
              <div data-test-subj={MOCK_INJECTED_COMPONENT_DATA_TEST_SUBJ}>{s.id}</div>
            ),
          },
        ],
      },
    });

    useCasesToastMock.mockReturnValue({ showSuccessToast: jest.fn() });
    useCreateAttachmentsMock.mockReturnValue({ mutateAsync: jest.fn(), isLoading: false });
  });

  it('renders the suggestion item when one suggestion is returned', async () => {
    useQueryMock.mockReturnValueOnce({
      data: { suggestions: [MOCK_SUGGESTION_1] },
      isLoading: false,
    });
    renderWithTestingProviders(<CaseSuggestions caseData={caseData} />);

    expect(await screen.findByTestId(`suggestion-${MOCK_SUGGESTION_1.id}`)).toBeInTheDocument();
  });

  it('renders a maximum of two suggestions even if three are returned', async () => {
    useQueryMock.mockReturnValueOnce({
      data: { suggestions: [MOCK_SUGGESTION_1, MOCK_SUGGESTION_2, MOCK_SUGGESTION_3] },
      isLoading: false,
    });

    renderWithTestingProviders(<CaseSuggestions caseData={caseData} />);

    expect(await screen.findByText(MOCK_SUGGESTION_1.id)).toBeInTheDocument();
    expect(await screen.findByText(MOCK_SUGGESTION_2.id)).toBeInTheDocument();
    expect(screen.queryByText(MOCK_SUGGESTION_3.id)).not.toBeInTheDocument();

    expect(screen.getAllByTestId(MOCK_INJECTED_COMPONENT_DATA_TEST_SUBJ)).toHaveLength(2);
  });

  it('shows the third suggestion when the first one is dismissed', async () => {
    useQueryMock.mockReturnValue({
      data: { suggestions: [MOCK_SUGGESTION_1, MOCK_SUGGESTION_2, MOCK_SUGGESTION_3] },
      isLoading: false,
    });

    renderWithTestingProviders(<CaseSuggestions caseData={caseData} />);

    expect(await screen.findByTestId(`suggestion-${MOCK_SUGGESTION_1.id}`)).toBeInTheDocument();
    expect(await screen.findByTestId(`suggestion-${MOCK_SUGGESTION_2.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`suggestion-${MOCK_SUGGESTION_3.id}`)).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId(`dismiss-suggestion-${MOCK_SUGGESTION_1.id}-button`));

    expect(await screen.findByTestId(`suggestion-${MOCK_SUGGESTION_3.id}`)).toBeInTheDocument();

    expect(screen.queryByText(MOCK_SUGGESTION_1.id)).not.toBeInTheDocument();
    expect(screen.getAllByTestId(MOCK_INJECTED_COMPONENT_DATA_TEST_SUBJ)).toHaveLength(2);
  });

  it('creates attachments when clicking Add to case', async () => {
    const MOCK_ATTACHMENT = { id: 'a1' };
    useQueryMock.mockReturnValue({
      data: { suggestions: [{ ...MOCK_SUGGESTION_1, data: [{ attachment: MOCK_ATTACHMENT }] }] },
      isLoading: false,
    });

    const mutateAsync = jest.fn();
    useCreateAttachmentsMock.mockReturnValue({ mutateAsync, isLoading: false });

    renderWithTestingProviders(<CaseSuggestions caseData={caseData} />);

    await userEvent.click(
      await screen.findByTestId(`add-suggestion-${MOCK_SUGGESTION_1.id}-button`)
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      caseId: caseData.id,
      caseOwner: caseData.owner,
      attachments: [MOCK_ATTACHMENT],
    });
  });

  it('does not render a suggestion if its componentId is not registered', async () => {
    useQueryMock.mockReturnValue({
      data: { suggestions: [{ ...MOCK_SUGGESTION_1, componentId: 'unknown-component' }] },
      isLoading: false,
    });

    renderWithTestingProviders(<CaseSuggestions caseData={caseData} />);

    expect(screen.queryByTestId(MOCK_INJECTED_COMPONENT_DATA_TEST_SUBJ)).not.toBeInTheDocument();
  });
});
