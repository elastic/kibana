/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { EnrichedDeprecationInfo } from '../../../../common/types';
import { createEsDeprecations } from './__fixtures__/es_deprecations';

jest.mock('../../app_context', () => {
  const actual = jest.requireActual('../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      kibanaVersionInfo: {
        currentMajor: 8,
        currentMinor: 0,
        currentPatch: 0,
      },
      services: {
        api: {
          useLoadMlUpgradeMode: () => ({ data: { mlUpgradeModeEnabled: false } }),
        },
      },
    }),
  };
});

jest.mock('./deprecation_types', () => {
  const TestRow = ({
    deprecation,
    index,
  }: {
    deprecation: EnrichedDeprecationInfo;
    index: number;
  }) => (
    <tr data-test-subj="deprecationTableRow" key={`deprecation-row-${index}`}>
      <td data-test-subj="stubTableCell-message">{deprecation.message}</td>
    </tr>
  );

  return {
    MlSnapshotsTableRow: TestRow,
    DefaultTableRow: TestRow,
    IndexSettingsTableRow: TestRow,
    IndexTableRow: TestRow,
    ClusterSettingsTableRow: TestRow,
    HealthIndicatorTableRow: TestRow,
    DataStreamTableRow: TestRow,
  };
});

describe('EsDeprecationsTable', () => {
  const reloadMock = jest.fn();

  const renderTable = async (deprecations: EnrichedDeprecationInfo[]) => {
    const { EsDeprecationsTable } = await import('./es_deprecations_table');
    renderWithI18n(<EsDeprecationsTable deprecations={deprecations} reload={reloadMock} />);
  };

  const getPaginationItemsCount = () => {
    return within(screen.getByTestId('esDeprecationsPagination')).getAllByTestId(
      /^pagination-button-\d+$/
    ).length;
  };

  const openStatusFilter = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(
      within(screen.getByTestId('searchBarContainer')).getByRole('button', { name: /Status/i })
    );
  };

  const openTypeFilter = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(
      within(screen.getByTestId('searchBarContainer')).getByRole('button', { name: /Type/i })
    );
  };

  const clickFilterOption = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
    await user.click(await screen.findByText(label));
  };

  it('calls reload when refresh is clicked', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(1);
    reloadMock.mockClear();

    await renderTable(migrationsDeprecations);

    await user.click(screen.getByTestId('refreshButton'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('shows the correct number of pages and deprecations per page', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(20);

    await renderTable(migrationsDeprecations);

    expect(getPaginationItemsCount()).toEqual(Math.ceil(migrationsDeprecations.length / 50));
    expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(50);

    await user.click(screen.getByTestId('pagination-button-1'));

    await waitFor(() => {
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
        migrationsDeprecations.length - 50
      );
    });
  });

  it('allows the number of viewable rows to change', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(20);

    await renderTable(migrationsDeprecations);

    await user.click(screen.getByTestId('tablePaginationPopoverButton'));
    const rowsPerPageButton = await screen.findByTestId('tablePagination-100-rows');
    await user.click(rowsPerPageButton);

    await waitFor(() => {
      expect(getPaginationItemsCount()).toEqual(Math.ceil(migrationsDeprecations.length / 100));
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
        migrationsDeprecations.length
      );
    });
  });

  it('updates pagination when filters change', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(20);
    const criticalDeprecations = migrationsDeprecations.filter((d) => d.level === 'critical');

    await renderTable(migrationsDeprecations);

    await openStatusFilter(user);
    await clickFilterOption(user, 'Critical');

    await waitFor(() => {
      expect(getPaginationItemsCount()).toEqual(Math.ceil(criticalDeprecations.length / 50));
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
        Math.min(criticalDeprecations.length, 50)
      );
    });
  });

  it('updates pagination when type filter changes', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(20);
    const mlDeprecations = migrationsDeprecations.filter((d) => d.type === 'ml_settings');

    await renderTable(migrationsDeprecations);

    await openTypeFilter(user);
    await clickFilterOption(user, 'Machine Learning');

    await waitFor(() => {
      expect(getPaginationItemsCount()).toEqual(Math.ceil(mlDeprecations.length / 50));
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
        Math.min(mlDeprecations.length, 50)
      );
    });
  });

  it('updates pagination on search', async () => {
    const { migrationsDeprecations } = createEsDeprecations(20);
    const reindexDeprecations = migrationsDeprecations.filter(
      (d) => d.correctiveAction?.type === 'reindex'
    );

    await renderTable(migrationsDeprecations);

    const input = within(screen.getByTestId('searchBarContainer')).getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Index created before 7.0' } });
    fireEvent.keyUp(input, { target: { value: 'Index created before 7.0' } });

    await waitFor(() => {
      expect(getPaginationItemsCount()).toEqual(Math.ceil(reindexDeprecations.length / 50));
      expect(screen.getAllByTestId('deprecationTableRow')).toHaveLength(
        Math.min(reindexDeprecations.length, 50)
      );
    });
  });

  it('maintains correct row state across pagination', async () => {
    const user = userEvent.setup();
    const { migrationsDeprecations } = createEsDeprecations(20);

    await renderTable(migrationsDeprecations);

    const getFirstRowMessageCellText = () => {
      const row = screen.getAllByTestId('deprecationTableRow')[0];
      return within(row).getByTestId(/-message$/).textContent;
    };

    expect(getPaginationItemsCount()).toBeGreaterThan(1);

    const firstDeprecationMessagePage1 = getFirstRowMessageCellText();

    await user.click(screen.getByTestId('pagination-button-1'));
    await waitFor(() => {
      expect(getFirstRowMessageCellText()).not.toEqual(firstDeprecationMessagePage1);
    });

    await user.click(screen.getByTestId('pagination-button-0'));
    await waitFor(() => {
      expect(getFirstRowMessageCellText()).toEqual(firstDeprecationMessagePage1);
    });
  });

  it('shows error for invalid search queries', async () => {
    const { migrationsDeprecations } = createEsDeprecations(1);
    await renderTable(migrationsDeprecations);

    const input = within(screen.getByTestId('searchBarContainer')).getByRole('searchbox');
    fireEvent.change(input, { target: { value: '%' } });
    fireEvent.keyUp(input, { target: { value: '%' } });

    expect(await screen.findByTestId('invalidSearchQueryMessage')).toBeInTheDocument();
  });

  it('shows message when search query does not return results', async () => {
    const { migrationsDeprecations } = createEsDeprecations(1);
    await renderTable(migrationsDeprecations);

    const input = within(screen.getByTestId('searchBarContainer')).getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'foobarbaz' } });
    fireEvent.keyUp(input, { target: { value: 'foobarbaz' } });

    expect(await screen.findByTestId('noDeprecationsRow')).toHaveTextContent(
      'No Elasticsearch deprecation issues found'
    );
  });
});
