/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { PreviewTable } from './preview_table';

// Mock the useKibana hook with the minimal set of dependencies used by the table.
jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    core: {},
    dependencies: {
      start: {
        share: {},
        fieldFormats: {},
        data: {
          dataViews: {
            create: jest.fn(),
          },
        },
      },
    },
  }),
}));

// Keep the real `isDocumentWithIgnoredFields` helper but stub the cell renderer so the
// test can focus on the column header accessibility markup.
jest.mock('./preview_table_cell', () => {
  const actual = jest.requireActual('./preview_table_cell');
  return {
    ...actual,
    PreviewTableCell: ({ columnId }: { columnId: string }) => <span>{`value:${columnId}`}</span>,
  };
});

const renderPreviewTable = (props: Partial<React.ComponentProps<typeof PreviewTable>> = {}) =>
  render(
    <I18nProvider>
      <PreviewTable
        documents={[{ '@timestamp': '2026-07-13T00:00:00.000Z', 'agent.name': 'filebeat' }]}
        {...props}
      />
    </I18nProvider>
  );

describe('PreviewTable accessibility', () => {
  it('marks the decorative field-type icon in column headers as aria-hidden', () => {
    renderPreviewTable();

    const fieldIcons = document.querySelectorAll('.kbnFieldIcon');
    expect(fieldIcons.length).toBeGreaterThan(0);
    fieldIcons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('does not expose the field-type icon label to assistive tech and keeps a clean header name', () => {
    renderPreviewTable();

    // The icon label is only present as visually-decorative content of the field-type
    // token; it must always sit inside an aria-hidden element so it is never announced.
    screen.getAllByText('unknown').forEach((node) => {
      expect(node.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    expect(screen.getByText('@timestamp')).toBeInTheDocument();
  });
});
