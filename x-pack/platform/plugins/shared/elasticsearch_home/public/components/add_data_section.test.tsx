/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { renderWithHomeContext } from '../test_utils';
import type { HomeAddDataLink } from '../types';
import { AddDataSection } from './add_data_section';

describe('AddDataSection', () => {
  const application = applicationServiceMock.createStartContract();
  const onPrimaryClick = jest.fn();

  const primaryAddDataLink: HomeAddDataLink = {
    key: 'embeddings',
    iconType: 'rocket',
    label: 'Generate or store embeddings',
    onClick: onPrimaryClick,
    testSubj: 'addDataPrimaryLink',
    telemetryId: 'testHost-home-addData-embeddings',
  };

  const renderSection = (config = {}) =>
    renderWithHomeContext(<AddDataSection />, {
      services: { application },
      config,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('the host-supplied primary link', () => {
    it('is rendered ahead of the generic entries', () => {
      renderSection({ primaryAddDataLink });

      const links = screen.getAllByRole('listitem');
      expect(links).toHaveLength(4);
      expect(links[0]).toHaveTextContent('Generate or store embeddings');
    });

    it('invokes the host handler when clicked', () => {
      renderSection({ primaryAddDataLink });

      fireEvent.click(screen.getByTestId('addDataPrimaryLink'));

      expect(onPrimaryClick).toHaveBeenCalled();
    });

    it('carries the telemetry id the host supplied', () => {
      renderSection({ primaryAddDataLink });

      expect(screen.getByTestId('addDataPrimaryLink')).toHaveAttribute(
        'data-telemetry-id',
        'testHost-home-addData-embeddings'
      );
    });

    it('is omitted when the host does not supply one', () => {
      renderSection();

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(screen.queryByTestId('addDataPrimaryLink')).not.toBeInTheDocument();
    });
  });

  it('namespaces the generic links under the host telemetry prefix', () => {
    renderSection();

    expect(screen.getByTestId('addDataDevToolsLink')).toHaveAttribute(
      'data-telemetry-id',
      'testHost-home-addData-devTools'
    );
  });
});
