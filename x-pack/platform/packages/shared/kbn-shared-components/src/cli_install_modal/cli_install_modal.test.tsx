/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { CliInstallModal } from './cli_install_modal';
import type { CliInstallModalProps } from './cli_install_modal';
import {
  CLI_COMMAND_REFERENCE_URL,
  CLI_INSTALL_COMMAND,
  CLI_REPO_URL,
  CLI_VERIFY_COMMAND,
  buildCliConnectCommand,
} from './constants';

const ES_URL = 'https://my-deployment.es.us-east-1.aws.elastic.cloud:443';

const renderModal = (overrides: Partial<CliInstallModalProps> = {}) =>
  render(
    <EuiThemeProvider>
      <CliInstallModal
        elasticsearchUrl={ES_URL}
        onClose={jest.fn()}
        telemetryIdPrefix="aHost-cliModal"
        {...overrides}
      />
    </EuiThemeProvider>
  );

describe('CliInstallModal', () => {
  it('renders the install, connect, and verify commands', () => {
    renderModal();

    expect(screen.getByTestId('cliInstallModalInstallCode')).toHaveTextContent(CLI_INSTALL_COMMAND);
    expect(screen.getByTestId('cliInstallModalConnectCode')).toHaveTextContent(ES_URL);
    expect(screen.getByTestId('cliInstallModalVerifyCode')).toHaveTextContent(CLI_VERIFY_COMMAND);
  });

  it('links to the CLI repo and command reference', () => {
    renderModal();

    expect(screen.getByTestId('cliInstallModalRepoLink')).toHaveAttribute('href', CLI_REPO_URL);
    expect(screen.getByTestId('cliInstallModalCommandReferenceLink')).toHaveAttribute(
      'href',
      CLI_COMMAND_REFERENCE_URL
    );
  });

  it('calls onClose when the Close button is clicked', () => {
    const onClose = jest.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByTestId('cliInstallModalCloseBtn'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('namespaces telemetry ids with the given prefix', () => {
    renderModal();

    expect(screen.getByTestId('cliInstallModalRepoLink')).toHaveAttribute(
      'data-telemetry-id',
      'aHost-cliModal-repoLink'
    );
    expect(screen.getByTestId('cliInstallModalCommandReferenceLink')).toHaveAttribute(
      'data-telemetry-id',
      'aHost-cliModal-commandReference'
    );
    expect(screen.getByTestId('cliInstallModalCloseBtn')).toHaveAttribute(
      'data-telemetry-id',
      'aHost-cliModal-close'
    );
  });
});

describe('buildCliConnectCommand', () => {
  it('includes the elasticsearch URL and API key placeholder', () => {
    const result = buildCliConnectCommand(ES_URL);

    expect(result).toContain('elastic config context add my-deployment');
    expect(result).toContain(`--es-url ${ES_URL}`);
    expect(result).toContain('--es-api-key <your-api-key>');
  });

  it('uses a URL placeholder when the elasticsearch URL is unknown', () => {
    expect(buildCliConnectCommand(null)).toContain('--es-url <your-elasticsearch-url>');
  });
});
