/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import type { TestRenderer } from '../../../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../../../mock';
import type { PackageInfo } from '../../../../../../types';

import { ColumnarIndexModeSetting } from './columnar_index_mode_setting';

const SWITCH = 'columnarIndexModeSwitch';

describe('ColumnarIndexModeSetting', () => {
  let packageInfo: PackageInfo;
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const onLogsdbColumnarChange = jest.fn();

  const render = (logsdbColumnar?: boolean) => {
    renderResult = testRenderer.render(
      <ColumnarIndexModeSetting
        packageInfo={packageInfo}
        logsdbColumnar={logsdbColumnar}
        onLogsdbColumnarChange={onLogsdbColumnarChange}
      />
    );
  };

  const logsDataStream = (dataset: string, title: string, elasticsearch = {}) =>
    ({ type: 'logs', dataset, title, path: dataset.split('.')[1], elasticsearch } as any);

  // Package-level readiness plus a second logs data stream, which can opt out of it.
  const declareReadiness = (
    readiness: 'opt_in' | 'default' = 'opt_in',
    { withUnsupported = false }: { withUnsupported?: boolean } = {}
  ) => {
    packageInfo.elasticsearch = { logsdb_columnar: readiness };
    packageInfo.data_streams = [
      ...(packageInfo.data_streams ?? []),
      logsDataStream(
        'nginx.error',
        'Nginx error logs',
        withUnsupported ? { logsdb_columnar: 'unsupported' } : {}
      ),
    ];
  };

  beforeEach(() => {
    packageInfo = {
      name: 'nginx',
      title: 'Nginx',
      version: '1.3.0',
      release: 'ga',
      description: '',
      format_version: '',
      owner: { github: '' },
      assets: {} as any,
      data_streams: [logsDataStream('nginx.access', 'Nginx access logs')],
      latestVersion: '1.3.0',
      keepPoliciesUpToDate: false,
      status: 'not_installed',
    };
    onLogsdbColumnarChange.mockClear();
    testRenderer = createFleetTestRendererMock();
  });

  it('is shown off and greyed out, with an explanation, when no logs data stream declares readiness', () => {
    render();

    const switchEl = renderResult.getByTestId(SWITCH);
    expect(switchEl).not.toBeChecked();
    expect(switchEl).toBeDisabled();
    expect(renderResult.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );
  });

  it('is not shown when the integration has no logs data stream', () => {
    packageInfo.data_streams = packageInfo.data_streams!.map((dataStream) => ({
      ...dataStream,
      type: 'metrics',
    }));
    render();

    expect(renderResult.queryByTestId(SWITCH)).not.toBeInTheDocument();
  });

  it('is not shown for input packages', () => {
    declareReadiness();
    packageInfo.type = 'input';
    render();

    expect(renderResult.queryByTestId(SWITCH)).not.toBeInTheDocument();
  });

  it('is off by default, and can be turned on, when every logs data stream is ready', () => {
    declareReadiness();
    render();

    const switchEl = renderResult.getByTestId(SWITCH);
    expect(switchEl).not.toBeChecked();
    expect(switchEl).not.toBeDisabled();
  });

  it('is greyed out, as not columnar-ready, unless every logs data stream is ready', () => {
    declareReadiness('opt_in', { withUnsupported: true });
    render();

    const switchEl = renderResult.getByTestId(SWITCH);
    expect(switchEl).not.toBeChecked();
    expect(switchEl).toBeDisabled();
    expect(renderResult.getByTestId('columnarIndexModeNotReady')).toHaveTextContent(
      "This integration isn't columnar-ready yet."
    );
  });

  it('stays on, and can be turned off, when the installation is on columnar but a data stream is no longer ready', () => {
    declareReadiness('opt_in', { withUnsupported: true });
    (packageInfo as any).installationInfo = { logsdb_columnar_enabled: true };
    render();

    const switchEl = renderResult.getByTestId(SWITCH);
    expect(switchEl).toBeChecked();
    expect(switchEl).not.toBeDisabled();

    fireEvent.click(switchEl);
    expect(onLogsdbColumnarChange).toHaveBeenCalledWith(false);
  });

  // On the edit page the policy can be on an older version than the installed one; the choice
  // belongs to the installation, so readiness comes from the installed version, as in the API.
  const installVersion = (version: string, installed: Partial<PackageInfo>) => {
    (packageInfo as any).installationInfo = { version, logsdb_columnar_enabled: false };
    testRenderer.startServices.http.get.mockImplementation(async (path: any) =>
      path === `/api/fleet/epm/packages/nginx/${version}`
        ? { item: { ...packageInfo, ...installed, version } }
        : undefined
    );
  };

  it('reads readiness from the installed version when the policy is on an older one', async () => {
    // The policy's version declares nothing; the installed one is ready.
    installVersion('2.0.0', { elasticsearch: { logsdb_columnar: 'opt_in' } });
    render();

    await waitFor(() => expect(renderResult.getByTestId(SWITCH)).not.toBeDisabled());
    expect(renderResult.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('is greyed out when the installed version is not ready, even if the policy version is', async () => {
    declareReadiness();
    installVersion('2.0.0', { elasticsearch: {} });
    render();

    await waitFor(() => expect(renderResult.getByTestId(SWITCH)).toBeDisabled());
  });

  it('reads readiness from the page version when it is newer than the installed one', () => {
    // The add page installs this newer version when it is saved.
    declareReadiness();
    installVersion('1.0.0', { elasticsearch: {} });
    render();

    expect(renderResult.getByTestId(SWITCH)).not.toBeDisabled();
    expect(testRenderer.startServices.http.get).not.toHaveBeenCalledWith(
      '/api/fleet/epm/packages/nginx/1.0.0',
      expect.anything()
    );
  });

  it('starts on for a new installation of a package that defaults to it', () => {
    declareReadiness('default');
    render();

    expect(renderResult.getByTestId(SWITCH)).toBeChecked();
  });

  it('does not start on from the package default unless every logs data stream is ready', () => {
    declareReadiness('default', { withUnsupported: true });
    render();

    expect(renderResult.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('starts from the choice stored on the installation', () => {
    declareReadiness('default');
    (packageInfo as any).installationInfo = { logsdb_columnar_enabled: false };
    render();

    expect(renderResult.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('reflects the choice picked on the page', () => {
    declareReadiness();
    render(true);

    expect(renderResult.getByTestId(SWITCH)).toBeChecked();
  });

  it('hands the new choice to the page', () => {
    declareReadiness();
    render();

    fireEvent.click(renderResult.getByTestId(SWITCH));

    expect(onLogsdbColumnarChange).toHaveBeenCalledWith(true);
  });
});
