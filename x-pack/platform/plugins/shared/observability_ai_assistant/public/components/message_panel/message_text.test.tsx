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
  describe('anonymizationHighlightPlugin', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders anonymized highlighted content with dedicated parser', () => {
      const secret = 'John Doe';
      const content = `Hi, my name is !{anonymizedContent(${secret})}.`;

      renderComponent(content);

      const anonymizedNode = screen.getByTestId('anonymizedContent');

      // Ensure the highlighted anonymized elements are rendered
      expect(anonymizedNode).toBeInTheDocument();
      expect(anonymizedNode).toHaveTextContent(secret);

      // Ensure original markup is not present in the DOM
      expect(screen.queryByText(`!{anonymizedContent(${secret})}`)).not.toBeInTheDocument();
    });

    it('renders multiple anonymized entities correctly', () => {
      const first = '{Alice}';
      const second = '((Bob()))))';

      const content = `Names: !{anonymizedContent(${first})} and !{anonymizedContent(${second})}.`;

      renderComponent(content);

      const anonymizedNodes = screen.getAllByTestId('anonymized_content');
      expect(anonymizedNodes.length).toBe(2);
      expect(anonymizedNodes[0]).toHaveTextContent(first);
      expect(anonymizedNodes[1]).toHaveTextContent(second);

      // Ensure original markup is not present in the DOM
      expect(screen.queryByText('anonymizedContent')).not.toBeInTheDocument();
    });

    it('leaves plain text unchanged when no anonymized entities are present', () => {
      const content = 'No anonymized entities here.';
      renderComponent(content);

      expect(screen.getByText(content)).toBeInTheDocument();
    });
  });
});
