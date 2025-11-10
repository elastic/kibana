/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateSourceEditor } from './update_source_editor';
import { ESQLSource } from './esql_source';

const mockGetDataViewFields = jest.fn().mockResolvedValue({
  dateFields: ['timestamp', 'utc_timestamp'],
  geoFields: ['location', 'utc_timestamp'],
});

describe('UpdateSourceEditor', () => {
  describe('narrow by map bounds switch', () => {
    function getNarrowByMapBoundsSwitch() {
      return screen.getByText('Dynamically filter for data in the visible map area');
    }

    test('should set geoField when checked and geo field is not set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        esql: 'from logs | keep location | limit 10000',
        narrowByMapBounds: false,
      });
      render(
        <UpdateSourceEditor
          onChange={onChange}
          sourceDescriptor={sourceDescriptor}
          getDataViewFields={mockGetDataViewFields}
        />
      );
      await waitFor(() => getNarrowByMapBoundsSwitch());
      await userEvent.click(getNarrowByMapBoundsSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith(
          { propName: 'narrowByMapBounds', value: true },
          { propName: 'geoField', value: 'location' }
        )
      );
    });

    test('should not reset geoField when checked and geoField is set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        esql: 'from logs | keep location | limit 10000',
        geoField: 'dest_location',
        narrowByMapBounds: false,
      });
      render(
        <UpdateSourceEditor
          onChange={onChange}
          sourceDescriptor={sourceDescriptor}
          getDataViewFields={mockGetDataViewFields}
        />
      );
      await waitFor(() => getNarrowByMapBoundsSwitch());
      await userEvent.click(getNarrowByMapBoundsSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith({ propName: 'narrowByMapBounds', value: true })
      );
    });
  });

  describe('narrow by time switch', () => {
    function getNarrowByTimeSwitch() {
      return screen.getByText('Apply global time range to ES|QL statement');
    }

    test('should set dateField when checked and date field is not set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        esql: 'from logs | keep location | limit 10000',
        narrowByGlobalTime: false,
      });
      render(
        <UpdateSourceEditor
          onChange={onChange}
          sourceDescriptor={sourceDescriptor}
          getDataViewFields={mockGetDataViewFields}
        />
      );
      await waitFor(() => getNarrowByTimeSwitch());
      await userEvent.click(getNarrowByTimeSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith(
          { propName: 'narrowByGlobalTime', value: true },
          { propName: 'dateField', value: 'timestamp' }
        )
      );
    });

    test('should not reset dateField when checked and dateField is set', async () => {
      const onChange = jest.fn();
      const sourceDescriptor = ESQLSource.createDescriptor({
        esql: 'from logs | keep location | limit 10000',
        dateField: 'utc_timestamp',
        narrowByGlobalTime: false,
      });
      render(
        <UpdateSourceEditor
          onChange={onChange}
          sourceDescriptor={sourceDescriptor}
          getDataViewFields={mockGetDataViewFields}
        />
      );
      await waitFor(() => getNarrowByTimeSwitch());
      await userEvent.click(getNarrowByTimeSwitch());
      await waitFor(() =>
        expect(onChange).toBeCalledWith({ propName: 'narrowByGlobalTime', value: true })
      );
    });
  });
});
