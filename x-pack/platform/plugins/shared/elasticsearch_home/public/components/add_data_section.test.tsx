/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithHomeContext } from '../test_utils';
import type { HomeAddDataLink } from '../types';
import { AddDataSection } from './add_data_section';

describe('AddDataSection', () => {
  const onEmbeddingsClick = jest.fn();

  const addDataLinks: HomeAddDataLink[] = [
    {
      key: 'embeddings',
      iconType: 'rocket',
      label: 'Generate or store embeddings',
      onClick: onEmbeddingsClick,
      testSubj: 'addDataEmbeddingsLink',
      telemetryId: 'testHost-home-addData-embeddings',
    },
    {
      key: 'devTools',
      iconType: 'code',
      label: 'Query your data in Console',
      onClick: jest.fn(),
      testSubj: 'addDataDevToolsLink',
      telemetryId: 'testHost-home-addData-devTools',
    },
  ];

  const renderSection = () =>
    renderWithHomeContext(<AddDataSection />, { config: { addDataLinks } });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the host-supplied links in order', () => {
    renderSection();

    const links = screen.getAllByRole('listitem');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Generate or store embeddings');
    expect(links[1]).toHaveTextContent('Query your data in Console');
  });

  it('invokes the host handler when a link is clicked', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('addDataEmbeddingsLink'));

    expect(onEmbeddingsClick).toHaveBeenCalled();
  });

  it('carries the telemetry id the host supplied', () => {
    renderSection();

    expect(screen.getByTestId('addDataEmbeddingsLink')).toHaveAttribute(
      'data-telemetry-id',
      'testHost-home-addData-embeddings'
    );
  });
});
