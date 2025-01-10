/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render as reactRender, type RenderResult } from '@testing-library/react';
import MicrosoftDefenderEndpointParamsFields from './microsoft_defender_endpoint_params';
import type { ActionParamsProps } from '@kbn/alerts-ui-shared';
import type { MicrosoftDefenderEndpointActionParams } from '../../../common/microsoft_defender_endpoint/types';
import React from 'react';
import { RUN_CONNECTOR_TEST_MESSAGE } from './translations';

describe('Microsoft Defender for Endpoint Params.', () => {
  let renderProps: ActionParamsProps<MicrosoftDefenderEndpointActionParams>;
  let render: () => RenderResult;

  beforeEach(() => {
    renderProps = {
      errors: {},
      editAction: jest.fn(),
      actionParams: {},
      index: 0,
    };
    render = () => reactRender(<MicrosoftDefenderEndpointParamsFields {...renderProps} />);
  });

  it('should render UI with expected message', () => {
    const { getByTestId } = render();

    expect(getByTestId('msDefenderParams')).toHaveTextContent(RUN_CONNECTOR_TEST_MESSAGE);
  });

  it('should set subAction to test_connector', () => {
    render();

    expect(renderProps.editAction).toHaveBeenCalledWith('subAction', 'testConnector', 0);
  });
});
