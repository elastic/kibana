/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputTypesBadges } from './input_types_badges';
import type { DataStreamResponse } from '../../../../../../common';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useEuiTheme: () => ({
      euiTheme: {
        colors: {
          backgroundBaseSubdued: '#f5f7fa',
          textParagraph: '#343741',
        },
      },
    }),
  };
});

const createInputTypes = (
  names: DataStreamResponse['inputTypes'][number]['name'][]
): DataStreamResponse['inputTypes'] => {
  return names.map((name) => ({ name }));
};

describe('InputTypesBadges', () => {
  describe('single badge', () => {
    it('should render single badge when only one input type', () => {
      render(<InputTypesBadges inputTypes={createInputTypes(['filestream'])} />);

      expect(screen.getByText('filestream')).toBeInTheDocument();
      expect(screen.queryByText('+1')).not.toBeInTheDocument();
    });

    it('should render badge group container', () => {
      render(<InputTypesBadges inputTypes={createInputTypes(['filestream'])} />);

      expect(screen.getByTestId('input-types-table-column-tags')).toBeInTheDocument();
    });
  });

  describe('multiple badges', () => {
    it('should render first badge and a +1 overflow count for two input types', () => {
      render(<InputTypesBadges inputTypes={createInputTypes(['filestream', 'http_endpoint'])} />);

      expect(screen.getByText('filestream')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('should render first badge and a +3 overflow count for 4 input types', () => {
      render(
        <InputTypesBadges
          inputTypes={createInputTypes(['filestream', 'http_endpoint', 'tcp', 'udp'])}
        />
      );

      expect(screen.getByText('filestream')).toBeInTheDocument();
      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should render tooltip of remaining badges', async () => {
      render(
        <InputTypesBadges inputTypes={createInputTypes(['filestream', 'http_endpoint', 'tcp'])} />
      );
      const overflowBadge = screen.getByText('+2');
      expect(overflowBadge).toBeInTheDocument();

      await userEvent.hover(overflowBadge);

      expect(await screen.findByText('http_endpoint')).toBeInTheDocument();
      expect(await screen.findByText('tcp')).toBeInTheDocument();
    });

    it('should not render httpjson directly when it is not the first badge', () => {
      render(<InputTypesBadges inputTypes={createInputTypes(['filestream', 'http_endpoint'])} />);

      const badges = screen.getAllByText(/filestream|\+1/);
      expect(badges).toHaveLength(2);
    });
  });
});
