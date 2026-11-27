/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { MergeCasesResolveResponse } from '../../../../common/types/api';
import { CaseSeverity } from '../../../../common/types/domain';
import { renderWithTestingProviders } from '../../../common/mock';
import { useResolveMergeConflicts } from '../use_resolve_merge_conflicts';
import type { MergeFieldChoices } from '../utils';
import { getDifferencesSummary, getFillableKeys } from '../value_cards/field_state';
import { IDENTITY_TEMPLATE, buildDifferencesPreview } from '../value_cards/test_fixtures';
import type { ConflictsBarProps } from './conflicts_bar';
import { ConflictsBar } from './conflicts_bar';

jest.mock('../../../common/lib/kibana');
jest.mock('../use_resolve_merge_conflicts');

const useResolveMergeConflictsMock = useResolveMergeConflicts as jest.Mock;

const setupBar = (overrides: Partial<ConflictsBarProps> & { choices?: MergeFieldChoices } = {}) => {
  const preview = overrides.preview ?? buildDifferencesPreview();
  const choices = overrides.choices ?? {};
  const props: ConflictsBarProps = {
    preview,
    caseIds: ['c118', 'c121', 'c124', 'c130'],
    choices,
    summary: getDifferencesSummary(preview, choices, new Set()),
    isAiAvailable: false,
    isDisabled: false,
    onApplyChoices: jest.fn(),
    onApplyAiResolution: jest.fn(),
    onGoToField: jest.fn(),
    ...overrides,
  };
  renderWithTestingProviders(<ConflictsBar {...props} />);
  return props;
};

describe('ConflictsBar', () => {
  beforeEach(() => {
    useResolveMergeConflictsMock.mockReturnValue({ mutate: jest.fn(), isLoading: false });
  });

  it('says how many conflicts are settled and jumps to the next open one', async () => {
    const props = setupBar({
      choices: { template: IDENTITY_TEMPLATE, title: 'Password spray against the Okta tenant' },
    });

    expect(screen.getByTestId('merge-conflicts-progress')).toHaveTextContent(
      `2 of ${props.summary.total} settled`
    );
    const [next] = props.summary.blocking;
    expect(screen.getByTestId('merge-conflicts-next')).toHaveTextContent(`Next: ${next.label}`);

    await userEvent.click(screen.getByTestId('merge-conflicts-next'));
    expect(props.onGoToField).toHaveBeenCalledWith(next.key);
  });

  it('offers Resolve with AI only when AI is available', () => {
    setupBar();

    expect(screen.queryByTestId('merge-resolve-with-ai-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('merge-fill-from-case-button')).toBeInTheDocument();
  });

  it("applies the AI's values and reasons", async () => {
    const response: MergeCasesResolveResponse = {
      fields: {
        title: 'Credential attacks on VPN and Okta',
        severity: CaseSeverity.CRITICAL,
        template: { id: IDENTITY_TEMPLATE.id },
      },
      reasons: [
        { field: 'title', reason: 'Covers every case.' },
        { field: 'severity', reason: '#124 is critical.' },
        { field: 'template', reason: 'Most cases are identity incidents.' },
      ],
    };
    const mutate = jest.fn(
      (
        _request: unknown,
        { onSuccess }: { onSuccess: (result: MergeCasesResolveResponse) => void }
      ) => onSuccess(response)
    );
    useResolveMergeConflictsMock.mockReturnValue({ mutate, isLoading: false });
    const props = setupBar({ isAiAvailable: true, destinationCaseId: 'c118' });

    await userEvent.click(screen.getByTestId('merge-resolve-with-ai-button'));

    expect(mutate).toHaveBeenCalledWith(
      { caseIds: ['c118', 'c121', 'c124', 'c130'], destinationCaseId: 'c118' },
      expect.anything()
    );
    expect(props.onApplyAiResolution).toHaveBeenCalledWith(
      {
        title: 'Credential attacks on VPN and Okta',
        severity: CaseSeverity.CRITICAL,
        template: IDENTITY_TEMPLATE,
      },
      new Map([
        ['title', 'Covers every case.'],
        ['severity', '#124 is critical.'],
        ['template', 'Most cases are identity incidents.'],
      ])
    );
  });

  it('holds the shortcuts while the AI is answering', () => {
    useResolveMergeConflictsMock.mockReturnValue({ mutate: jest.fn(), isLoading: true });
    setupBar({ isAiAvailable: true });

    expect(screen.getByTestId('merge-resolve-with-ai-button')).toHaveTextContent('Resolving…');
    expect(screen.getByTestId('merge-fill-from-case-button')).toBeDisabled();
  });

  it('fills every field that differs from the case picked in the menu', async () => {
    const preview = buildDifferencesPreview();
    const choices: MergeFieldChoices = { title: 'Mine', category: 'Identity' };
    const props = setupBar({ preview, choices });

    await userEvent.click(screen.getByTestId('merge-fill-from-case-button'));
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('merge-fill-from-case-menu')).toHaveTextContent(
      `Replaces all ${getFillableKeys(preview, choices).length} fields that differ`
    );
    await userEvent.click(screen.getByTestId('merge-fill-from-case-option-c124'));

    expect(props.onApplyChoices).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Impossible travel for j.chen (Lagos to Oslo)',
        category: 'Identity',
        template: IDENTITY_TEMPLATE,
      })
    );
  });
});
