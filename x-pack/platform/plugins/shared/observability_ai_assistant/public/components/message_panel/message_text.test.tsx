/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageText } from './message_text';

const renderComponent = (content: string, props: Partial<Parameters<typeof MessageText>[0]> = {}) =>
  render(<MessageText loading={false} content={content} onActionClick={jest.fn()} {...props} />);

describe('MessageText', () => {
  describe('anonymizedHighlightPlugin', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders anonymized highlighted content with dedicated parser', () => {
      const entity = 'John Doe';
      const message = `Hi, my name is !{anonymized{"entityClass":"PER", "content": "${entity}"}}.`;

      renderComponent(message);

      const anonymizedNode = screen.getByTestId('anonymizedContent');

      // Ensure the highlighted anonymized elements are rendered
      expect(anonymizedNode).toBeInTheDocument();
      expect(anonymizedNode).toHaveTextContent(entity);

      // Ensure original markup is not present in the DOM
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    });

    it('renders multiple anonymized entities correctly', () => {
      const firstEntity = '{Alice}';
      const secondEntity = '((Bob()))))';

      const message = `Names: !{anonymized{"entityClass":"PER", "content": "${firstEntity}"}} and !{anonymized{"entityClass":"PER", "content": "${secondEntity}"}}.`;

      renderComponent(message);

      const anonymizedNodes = screen.getAllByTestId('anonymizedContent');
      expect(anonymizedNodes.length).toBe(2);
      expect(anonymizedNodes[0]).toHaveTextContent(firstEntity);
      expect(anonymizedNodes[1]).toHaveTextContent(secondEntity);

      // Ensure original markup is not present in the DOM
      expect(screen.queryByText('anonymized')).not.toBeInTheDocument();
    });

    it('leaves plain text unchanged when no anonymized entities are present', () => {
      const message = 'No anonymized entities here.';
      renderComponent(message);

      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });
});
