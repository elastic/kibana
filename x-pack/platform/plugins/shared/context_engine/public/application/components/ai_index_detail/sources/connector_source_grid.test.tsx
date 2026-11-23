/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { SelectedSource } from './types';
import { ConnectorSourceGrid } from './connector_source_grid';

const CONNECTOR_ID = 'connector-gdrive';

const connectorSources: SelectedSource[] = [
  { type: 'connector', value: CONNECTOR_ID },
  { type: 'connector', value: 'connector-github' },
];

const connectorNameById = new Map([
  [CONNECTOR_ID, 'Google Drive'],
  ['connector-github', 'GitHub'],
]);
const connectorActionTypeById = new Map([
  [CONNECTOR_ID, '.google_drive'],
  ['connector-github', '.github'],
]);
const connectorTypeNameById = new Map([
  [CONNECTOR_ID, 'Google Drive type'],
  ['connector-github', 'GitHub type'],
]);

const renderGrid = (ui: React.ReactElement) => {
  const services = {
    ...coreMock.createStart(),
    triggersActionsUi: triggersActionsUiMock.createStart(),
  };
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>{ui}</KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const defaultGridProps = {
  sources: connectorSources,
  connectorNameById,
  connectorActionTypeById,
  connectorTypeNameById,
};

describe('ConnectorSourceGrid', () => {
  it('renders a saved connector card per source with resolved labels', () => {
    renderGrid(<ConnectorSourceGrid {...defaultGridProps} />);

    expect(screen.getByTestId('contextSelectedSource-connector-0')).toHaveTextContent(
      'Google Drive'
    );
    expect(screen.getByTestId('contextSelectedSource-connector-0')).toHaveTextContent(
      'Google Drive type'
    );
    expect(screen.getByTestId('contextSelectedSource-connector-1')).toHaveTextContent('GitHub');
    expect(screen.getByTestId('contextSelectedSource-connector-1')).toHaveTextContent(
      'GitHub type'
    );
  });

  it('renders the addCard slot when provided', () => {
    renderGrid(
      <ConnectorSourceGrid
        {...defaultGridProps}
        addCard={<div data-test-subj="contextTestAddCard" />}
      />
    );

    expect(screen.getByTestId('contextTestAddCard')).toBeInTheDocument();
  });

  it('does not render the addCard slot when it is omitted', () => {
    renderGrid(<ConnectorSourceGrid {...defaultGridProps} />);

    expect(screen.queryByTestId('contextTestAddCard')).not.toBeInTheDocument();
  });

  it('wires onRemove to the remove button', () => {
    const onRemove = jest.fn();
    renderGrid(<ConnectorSourceGrid {...defaultGridProps} onRemove={onRemove} />);

    const firstCard = screen.getByTestId('contextSelectedSource-connector-0');
    fireEvent.click(within(firstCard).getByTestId('contextRemoveSourceButton'));

    expect(onRemove).toHaveBeenCalledWith(connectorSources[0]);
  });

  it('omits remove buttons when onRemove is undefined', () => {
    renderGrid(<ConnectorSourceGrid {...defaultGridProps} />);

    expect(screen.queryByTestId('contextRemoveSourceButton')).not.toBeInTheDocument();
  });

  it('disables remove buttons when disabled is true', () => {
    renderGrid(<ConnectorSourceGrid {...defaultGridProps} onRemove={jest.fn()} disabled />);

    expect(screen.getAllByTestId('contextRemoveSourceButton')[0]).toBeDisabled();
  });
});
