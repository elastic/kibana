/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { renderWithTestingProviders } from '../../../common/mock';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { CaseRefs } from './case_refs';
import type { ValueCardOption } from './value_card';
import { ValueCardGroup } from './value_card_group';
import { CASES } from './test_fixtures';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../../common/navigation/hooks', () => ({
  ...jest.requireActual('../../../common/navigation/hooks'),
  useCaseViewNavigation: () => ({
    navigateToCaseView: jest.fn(),
    getCaseViewUrl: ({ detailName }: { detailName: string }) => `/cases/${detailName}`,
  }),
}));

const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

const options = (count: number): ValueCardOption[] =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    label: `Value ${index}`,
    caseIds: [CASES[index % CASES.length].id],
    searchText: `Value ${index}`,
  }));

describe('CaseRefs', () => {
  beforeEach(() => {
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
  });

  it('shows every case number up to the limit', () => {
    renderWithTestingProviders(<CaseRefs caseIds={['c118', 'c121', 'c124']} cases={CASES} />);

    expect(screen.getByText('#118')).toBeInTheDocument();
    expect(screen.getByText('#124')).toBeInTheDocument();
    expect(screen.queryByTestId('merge-case-refs-more')).not.toBeInTheDocument();
  });

  it('collapses the rest behind a "+N" chip that lists them', async () => {
    renderWithTestingProviders(
      <CaseRefs caseIds={['c118', 'c121', 'c124', 'c130']} cases={CASES} />
    );

    expect(screen.getByText('#118')).toBeInTheDocument();
    expect(screen.getByText('#121')).toBeInTheDocument();
    expect(screen.queryByText('#124')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('merge-case-refs-more'));
    await waitForEuiPopoverOpen();

    const list = screen.getByTestId('merge-case-refs-more-list');
    expect(within(list).getByText('#124')).toBeInTheDocument();
    expect(within(list).getByText('Password spray against the Okta tenant')).toBeInTheDocument();
  });

  it('opens a card about the case when its number is clicked, not the case itself', async () => {
    renderWithTestingProviders(<CaseRefs caseIds={['c130']} cases={CASES} />);

    const chip = screen.getByTestId('merge-case-ref-c130');
    expect(chip).not.toHaveAttribute('href');
    expect(screen.queryByTestId('merge-case-hover-card-c130')).not.toBeInTheDocument();

    await userEvent.click(chip);

    const card = await screen.findByTestId('merge-case-hover-card-c130');
    const title = within(card).getByTestId('merge-case-hover-card-title');
    expect(title).toHaveTextContent('Password spray against the Okta tenant');
    expect(within(title).getByRole('link')).toHaveAttribute('href', '/cases/c130');
    expect(within(title).getByRole('link')).toHaveAttribute('target', '_blank');
    expect(within(card).queryByText('#130')).not.toBeInTheDocument();
    expect(within(card).getByTestId('merge-case-hover-card-closed')).toHaveTextContent(
      'Marco Silva'
    );
    expect(within(card).getByTestId('merge-case-hover-card-description')).toHaveTextContent(
      'Spray of 6 common passwords across 1,900 Okta accounts.'
    );
    expect(within(card).queryByTestId('merge-case-hover-card-assignees')).not.toBeInTheDocument();
    expect(within(card).queryByTestId('merge-case-hover-card-holds')).not.toBeInTheDocument();
  });

  it('opens the card from the keyboard, and closes it from the number', async () => {
    renderWithTestingProviders(<CaseRefs caseIds={['c130']} cases={CASES} />);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await screen.findByTestId('merge-case-hover-card-c130');
    await waitForEuiPopoverOpen();
    expect(screen.getByTestId('merge-case-ref-c130')).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(screen.getByTestId('merge-case-ref-c130'));
    await waitFor(() =>
      expect(screen.queryByTestId('merge-case-hover-card-c130')).not.toBeInTheDocument()
    );
  });
});

describe('ValueCardGroup', () => {
  beforeEach(() => {
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map(), isLoading: false });
  });

  it('shows every value with nothing picked', () => {
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(4)}
        onSelect={jest.fn()}
        cases={CASES}
      />
    );

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    radios.forEach((radio) => expect(radio).not.toBeChecked());
  });

  it('calls back with the value the user picks', async () => {
    const onSelect = jest.fn();
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(2)}
        onSelect={onSelect}
        cases={CASES}
      />
    );

    await userEvent.click(screen.getByText('Value 1'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it("doesn't pick a value when its case number or case card is clicked", async () => {
    const onSelect = jest.fn();
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(4)}
        onSelect={onSelect}
        cases={CASES}
      />
    );

    await userEvent.click(screen.getByText('#130'));
    await screen.findByTestId('merge-case-hover-card-c130');
    await waitForEuiPopoverOpen();
    await userEvent.click(screen.getByTestId('merge-case-hover-card-description'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('collapses more than five values behind "Show N more"', async () => {
    const onSelect = jest.fn();
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(7)}
        onSelect={onSelect}
        cases={CASES}
        moreLabel={(count) => `Show ${count} more titles`}
      />
    );

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    await userEvent.click(screen.getByText('Show 3 more titles'));

    expect(screen.getAllByRole('radio')).toHaveLength(7);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Value 6/ }));
    expect(onSelect).toHaveBeenCalledWith('6');

    await userEvent.click(screen.getByText('Show fewer'));
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('keeps a picked value from the rest in view when collapsed', () => {
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(7)}
        selectedId="6"
        onSelect={jest.fn()}
        cases={CASES}
        moreLabel={(count) => `Show ${count} more titles`}
      />
    );

    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /Value 6/ })).toBeChecked();
    expect(screen.getByText('Show 2 more titles')).toBeInTheDocument();
  });

  it("can't pick a value the template rejects, and says why", () => {
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="extendedFields.attack_vector_as_keyword"
        legend="Attack vector"
        options={[
          {
            id: '0',
            label: 'Brute force',
            caseIds: ['c118'],
            searchText: 'Brute force',
            invalid: { code: 'notAnOption', message: 'Not an option in Identity incident' },
          },
        ]}
        onSelect={jest.fn()}
        cases={CASES}
      />
    );

    expect(screen.getByRole('radio')).toBeDisabled();
    expect(screen.getByTestId('merge-value-card-invalid')).toHaveTextContent(
      'Not an option in Identity incident'
    );
  });

  it('opens the input inside the Other card', async () => {
    const onOther = jest.fn();
    const { rerender } = renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(2)}
        onSelect={jest.fn()}
        cases={CASES}
        other={{
          label: 'Other title',
          isSelected: false,
          onSelect: onOther,
          input: <input aria-label="own title" />,
        }}
      />
    );

    expect(screen.queryByLabelText('own title')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Other title'));
    expect(onOther).toHaveBeenCalled();

    rerender(
      <ValueCardGroup
        fieldKey="title"
        legend="Title"
        options={options(2)}
        onSelect={jest.fn()}
        cases={CASES}
        other={{
          label: 'Other title',
          isSelected: true,
          onSelect: onOther,
          input: <input aria-label="own title" />,
        }}
      />
    );
    expect(screen.getByLabelText('own title')).toBeInTheDocument();
  });

  it("doesn't pick a value when the user opens its case list", async () => {
    const onSelect = jest.fn();
    renderWithTestingProviders(
      <ValueCardGroup
        fieldKey="category"
        legend="Category"
        options={[
          {
            id: '0',
            label: 'Identity',
            caseIds: ['c118', 'c121', 'c124', 'c130'],
            searchText: 'Identity',
          },
        ]}
        onSelect={onSelect}
        cases={CASES}
      />
    );

    await userEvent.click(screen.getByTestId('merge-case-refs-more'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
