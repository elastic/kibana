/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { UserMessageText } from './user_message_text';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('UserMessageText', () => {
  describe('plain text', () => {
    it('renders plain text without badges', () => {
      renderWithProvider(<UserMessageText text="hello world" />);

      expect(screen.getByText('hello world')).toBeInTheDocument();
    });

    it('renders empty text', () => {
      const { container } = renderWithProvider(<UserMessageText text="" />);

      expect(container).toBeInTheDocument();
    });

    it('preserves single newlines (Shift+Enter) as line breaks within one paragraph', () => {
      const { container } = renderWithProvider(
        <UserMessageText text={'First line\nSecond line\nThird line'} />
      );

      // A single paragraph, not three, with <br> elements marking each line break.
      expect(container.querySelectorAll('p')).toHaveLength(1);
      expect(container.querySelectorAll('br')).toHaveLength(2);
      expect(screen.getByText(/First line/)).toBeInTheDocument();
      expect(screen.getByText(/Second line/)).toBeInTheDocument();
      expect(screen.getByText(/Third line/)).toBeInTheDocument();
    });

    it('does not mangle ES|QL-like pasted content (pipes, underscored field names)', () => {
      renderWithProvider(
        <UserMessageText text={'FROM logs-* | WHERE host_name == "server_1" AND bytes > 1000'} />
      );

      expect(
        screen.getByText('FROM logs-* | WHERE host_name == "server_1" AND bytes > 1000')
      ).toBeInTheDocument();
    });

    it('does not turn a pasted JSON blob into a table or emphasis', () => {
      const { container } = renderWithProvider(
        <UserMessageText text={'{"key": "value", "nested_field": 42}'} />
      );

      expect(screen.getByText('{"key": "value", "nested_field": 42}')).toBeInTheDocument();
      expect(container.querySelector('table')).not.toBeInTheDocument();
      expect(container.querySelector('em')).not.toBeInTheDocument();
    });
  });

  describe('markdown formatting', () => {
    it('renders bold, italic and strikethrough', () => {
      const { container } = renderWithProvider(
        <UserMessageText text="This is **bold**, this is _italic_, and this is ~~gone~~." />
      );

      expect(container.querySelector('strong')).toHaveTextContent('bold');
      expect(container.querySelector('em')).toHaveTextContent('italic');
      expect(container.querySelector('del')).toHaveTextContent('gone');
    });

    it('renders headings', () => {
      renderWithProvider(<UserMessageText text={'# Heading 1\n\n## Heading 2'} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Heading 2' })).toBeInTheDocument();
    });

    it('renders ordered and unordered lists, including nesting', () => {
      const { container } = renderWithProvider(
        <UserMessageText text={'- item one\n- item two\n  - nested item\n\n1. first\n2. second'} />
      );

      const lists = container.querySelectorAll('ul, ol');
      expect(lists.length).toBeGreaterThanOrEqual(3); // outer ul, nested ul, ol
      expect(screen.getByText('item one')).toBeInTheDocument();
      expect(screen.getByText('nested item')).toBeInTheDocument();
      expect(screen.getByText('first')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();
    });

    it('renders inline code and fenced code blocks', () => {
      const { container } = renderWithProvider(
        <UserMessageText text={'Use `EuiMarkdownFormat` for this.\n\n```js\nconst x = 1;\n```'} />
      );

      expect(container.querySelector('code')).toHaveTextContent('EuiMarkdownFormat');
      // Prism syntax highlighting splits the code into multiple <span> tokens, so match on the
      // block's overall text content rather than a single text node.
      expect(container.querySelector('pre')).toHaveTextContent('const x = 1;');
    });

    it('renders GFM tables', () => {
      renderWithProvider(<UserMessageText text={'| A | B |\n| --- | --- |\n| foo | bar |'} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'foo' })).toBeInTheDocument();
    });

    it('renders blockquotes', () => {
      const { container } = renderWithProvider(<UserMessageText text="> quoted line" />);

      expect(container.querySelector('blockquote')).toHaveTextContent('quoted line');
    });
  });

  describe('plain links', () => {
    it('renders a real link that opens in a new tab without a confirmation modal', () => {
      renderWithProvider(<UserMessageText text="Check out [Elastic](https://www.elastic.co)." />);

      const link = screen.getByRole('link', { name: 'Elastic' });
      expect(link).toHaveAttribute('href', 'https://www.elastic.co');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
      fireEvent.click(link);
      // No confirmation dialog should appear — clicking is a no-op in jsdom, but nothing should throw
      // or render a modal.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('falls back to literal text for a disallowed URL scheme', () => {
      renderWithProvider(<UserMessageText text="[/Unknown](unknown://id-1)" />);

      expect(screen.getByText('[/Unknown](unknown://id-1)')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('badges', () => {
    it('renders a command badge from serialized format', () => {
      renderWithProvider(<UserMessageText text="[/Summarize](skill://skill-1)" />);

      expect(screen.getByText('/Summarize')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('renders mixed text and command badges', () => {
      renderWithProvider(<UserMessageText text="Use [/Summarize](skill://skill-1) to do this" />);

      expect(screen.getByText('/Summarize')).toBeInTheDocument();
      expect(screen.getByText(/Use/)).toBeInTheDocument();
      expect(screen.getByText(/to do this/)).toBeInTheDocument();
    });

    it('renders SML badges with full type/title text', () => {
      renderWithProvider(<UserMessageText text="[@dashboard/A](sml://entry-1)" />);

      expect(screen.getByText('@dashboard/A')).toBeInTheDocument();
    });

    it('renders an image badge for image scheme links', () => {
      renderWithProvider(<UserMessageText text="[photo.png](image://photo.png)" />);

      expect(screen.getByText('photo.png')).toBeInTheDocument();
    });

    it('renders image badge alongside plain text', () => {
      renderWithProvider(
        <UserMessageText text="See [screenshot.png](image://screenshot.png) for details" />
      );

      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
      expect(screen.getByText(/See/)).toBeInTheDocument();
      expect(screen.getByText(/for details/)).toBeInTheDocument();
    });

    it('decodes percent-encoded image names', () => {
      renderWithProvider(
        <UserMessageText text="[Screenshot (1).png](image://Screenshot%20%281%29.png)" />
      );

      expect(screen.getByText('Screenshot (1).png')).toBeInTheDocument();
    });

    it('renders a badge nested inside a list item', () => {
      renderWithProvider(<UserMessageText text="- Use [/Summarize](skill://skill-1) first" />);

      expect(screen.getByRole('listitem')).toHaveTextContent('Use /Summarize first');
      expect(screen.getByText('/Summarize')).toBeInTheDocument();
    });

    it('renders a badge nested inside bold text', () => {
      const { container } = renderWithProvider(
        <UserMessageText text="Also **bold with [/Summarize](skill://skill-1) inside**." />
      );

      const strong = container.querySelector('strong');
      expect(strong).toHaveTextContent('bold with /Summarize inside');
      expect(screen.getByText('/Summarize')).toBeInTheDocument();
    });

    describe('onHoverImage', () => {
      it('calls onHoverImage with the image name on mouse enter', () => {
        const onHoverImage = jest.fn();
        renderWithProvider(
          <UserMessageText text="[photo.png](image://photo.png)" onHoverImage={onHoverImage} />
        );

        const badge = screen.getByText('photo.png').closest('span')!;
        fireEvent.mouseEnter(badge);
        expect(onHoverImage).toHaveBeenCalledWith('photo.png');
      });

      it('calls onHoverImage with null on mouse leave', () => {
        const onHoverImage = jest.fn();
        renderWithProvider(
          <UserMessageText text="[photo.png](image://photo.png)" onHoverImage={onHoverImage} />
        );

        const badge = screen.getByText('photo.png').closest('span')!;
        fireEvent.mouseLeave(badge);
        expect(onHoverImage).toHaveBeenCalledWith(null);
      });

      it('does not crash when onHoverImage is not provided', () => {
        renderWithProvider(<UserMessageText text="[photo.png](image://photo.png)" />);
        const badge = screen.getByText('photo.png').closest('span')!;
        expect(() => {
          fireEvent.mouseEnter(badge);
          fireEvent.mouseLeave(badge);
        }).not.toThrow();
      });
    });
  });
});
