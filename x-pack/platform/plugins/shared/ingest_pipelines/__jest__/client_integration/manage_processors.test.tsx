/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';

import type { GeoipDatabase } from '../../common/types';
import { API_BASE_PATH } from '../../common/constants';
import { ManageProcessors } from '../../public/application/sections';
import { getManageProcessorsPath, ROUTES } from '../../public/application/services/navigation';
import { setupEnvironment, WithAppDependencies } from './helpers/setup_environment';

describe('<ManageProcessors />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  const renderManageProcessors = async (expectedTestId: string) => {
    const history = createMemoryHistory({ initialEntries: [getManageProcessorsPath()] });
    const Wrapped = WithAppDependencies(ManageProcessors, httpSetup);

    render(
      <Router history={history}>
        <Route path={ROUTES.manageProcessors} component={Wrapped} />
      </Router>
    );

    await screen.findByTestId('manageProcessorsTitle');
    await screen.findByTestId(expectedTestId);
  };

  describe('With databases', () => {
    const database1: GeoipDatabase = {
      name: 'GeoIP2-Anonymous-IP',
      id: 'geoip2-anonymous-ip',
      type: 'maxmind',
    };

    const database2: GeoipDatabase = {
      name: 'GeoIP2-City',
      id: 'geoip2-city',
      type: 'maxmind',
    };

    const database3: GeoipDatabase = {
      name: 'GeoIP2-Country',
      id: 'geoip2-country',
      type: 'maxmind',
    };

    const database4: GeoipDatabase = {
      name: 'Free-IP-to-ASN',
      id: 'free-ip-to-asn',
      type: 'ipinfo',
    };

    const databases = [database1, database2, database3, database4];

    test('renders the list of databases', async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadDatabasesResponse(databases);
      await renderManageProcessors('geoipDatabaseList');

      // Page title
      expect(screen.getByTestId('manageProcessorsTitle')).toHaveTextContent('Manage Processors');

      // Add database button
      expect(screen.getByTestId('addGeoipDatabaseButton')).toBeInTheDocument();

      const rows = screen.getAllByTestId('geoipDatabaseListRow');
      expect(rows).toHaveLength(databases.length);
      rows.forEach((row, i) => {
        const database = databases[i];
        expect(within(row).getByText(database.name)).toBeInTheDocument();
        expect(
          within(row).getByText(database.type === 'maxmind' ? 'MaxMind' : 'IPinfo')
        ).toBeInTheDocument();
      });
    });

    test('deletes a database', async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadDatabasesResponse(databases);
      httpRequestsMockHelpers.setDeleteDatabasesResponse(database1.id, {});
      await renderManageProcessors('geoipDatabaseList');

      const firstRow = screen.getAllByTestId('geoipDatabaseListRow')[0];
      fireEvent.click(within(firstRow).getByTestId('deleteGeoipDatabaseButton'));

      const modalSubmit = await screen.findByTestId('deleteGeoipDatabaseSubmit');
      fireEvent.change(screen.getByTestId('geoipDatabaseConfirmation'), {
        target: { value: 'delete' },
      });
      await waitFor(() => expect(modalSubmit).not.toBeDisabled());

      const deleteCallsBefore = httpSetup.delete.mock.calls.length;
      fireEvent.click(modalSubmit);

      await waitFor(() =>
        expect(httpSetup.delete.mock.calls.length).toBeGreaterThan(deleteCallsBefore)
      );
      const deleteRequest = httpSetup.delete.mock.results[deleteCallsBefore]?.value as
        | Promise<unknown>
        | undefined;
      expect(deleteRequest).toBeDefined();
      await waitFor(async () => {
        await deleteRequest;
      });

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/databases/${database1.id}`,
        expect.anything()
      );
    });
  });

  describe('Creates a database', () => {
    it('creates a MaxMind database when none with the same name exists', async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadDatabasesResponse([]);
      const databaseName = 'GeoIP2-ISP';
      const maxmind = '123456';
      httpRequestsMockHelpers.setCreateDatabasesResponse({
        name: databaseName,
        id: databaseName.toLowerCase(),
      });

      await renderManageProcessors('geoipEmptyListPrompt');
      fireEvent.click(screen.getByTestId('addGeoipDatabaseButton'));
      await screen.findByTestId('addGeoipDatabaseForm');

      fireEvent.change(screen.getByTestId('databaseTypeSelect'), { target: { value: 'maxmind' } });
      fireEvent.change(screen.getByTestId('maxmindField'), { target: { value: maxmind } });
      fireEvent.change(screen.getByTestId('databaseNameSelect'), {
        target: { value: databaseName },
      });

      const postCallsBefore = httpSetup.post.mock.calls.length;
      fireEvent.click(screen.getByTestId('addGeoipDatabaseSubmit'));
      await waitFor(() =>
        expect(httpSetup.post.mock.calls.length).toBeGreaterThan(postCallsBefore)
      );

      expect(httpSetup.post).toHaveBeenLastCalledWith(`${API_BASE_PATH}/databases`, {
        asSystemRequest: undefined,
        body: '{"databaseType":"maxmind","databaseName":"GeoIP2-ISP","maxmind":"123456"}',
        query: undefined,
        version: undefined,
      });
    });

    it('creates an IPinfo database when none with the same name exists', async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadDatabasesResponse([]);
      const databaseName = 'standard_asn';
      httpRequestsMockHelpers.setCreateDatabasesResponse({
        name: 'ASN',
        id: 'asn',
      });

      await renderManageProcessors('geoipEmptyListPrompt');
      fireEvent.click(screen.getByTestId('addGeoipDatabaseButton'));
      await screen.findByTestId('addGeoipDatabaseForm');

      fireEvent.change(screen.getByTestId('databaseTypeSelect'), { target: { value: 'ipinfo' } });
      fireEvent.change(screen.getByTestId('databaseNameSelect'), {
        target: { value: databaseName },
      });

      const postCallsBefore = httpSetup.post.mock.calls.length;
      fireEvent.click(screen.getByTestId('addGeoipDatabaseSubmit'));
      await waitFor(() =>
        expect(httpSetup.post.mock.calls.length).toBeGreaterThan(postCallsBefore)
      );

      expect(httpSetup.post).toHaveBeenLastCalledWith(`${API_BASE_PATH}/databases`, {
        asSystemRequest: undefined,
        body: '{"databaseType":"ipinfo","databaseName":"standard_asn","maxmind":""}',
        query: undefined,
        version: undefined,
      });
    });
  });

  describe('No databases', () => {
    test('displays an empty prompt', async () => {
      jest.clearAllMocks();
      httpRequestsMockHelpers.setLoadDatabasesResponse([]);
      await renderManageProcessors('geoipEmptyListPrompt');
      expect(screen.getByTestId('geoipEmptyListPrompt')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    test('displays an error callout', async () => {
      jest.clearAllMocks();
      const error = {
        statusCode: 500,
        error: 'Internal server error',
        message: 'Internal server error',
      };

      httpRequestsMockHelpers.setLoadDatabasesResponse(undefined, error);
      await renderManageProcessors('geoipListLoadingError');
      expect(screen.getByTestId('geoipListLoadingError')).toBeInTheDocument();
    });
  });
});
