/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ensureDirSync, createSync } from '../util';
import { createAgentInput } from './agent';
import { CelInput, InputType } from '../../common';
import { render } from 'nunjucks';

jest.mock('../util', () => ({
  ...jest.requireActual('../util'),
  createSync: jest.fn(),
  ensureDirSync: jest.fn(),
}));

jest.mock('nunjucks');

describe('createAgentInput', () => {
  const dataStreamPath = 'path';

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Should create expected files', async () => {
    const inputTypes: InputType[] = ['aws-s3', 'filestream', 'cel'];

    createAgentInput(dataStreamPath, inputTypes, undefined);

    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/agent/stream`);

    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/agent/stream/aws-s3.yml.hbs`,
      expect.any(String)
    );
    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/agent/stream/filestream.yml.hbs`,
      expect.any(String)
    );
  });

  it('Should create expected files for cel without generated cel results', async () => {
    const inputTypes: InputType[] = ['cel'];

    createAgentInput(dataStreamPath, inputTypes, undefined);

    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/agent/stream`);

    expect(createSync).toHaveBeenCalledWith(
      `${dataStreamPath}/agent/stream/cel.yml.hbs`,
      expect.any(String)
    );
  });

  it('Should not create agent files if there are no input types', async () => {
    createAgentInput(dataStreamPath, [], undefined);

    expect(ensureDirSync).toHaveBeenCalledWith(`${dataStreamPath}/agent/stream`);
    expect(createSync).not.toHaveBeenCalled();
  });

  it('Should create generated cel agent file if provided', async () => {
    const inputTypes: InputType[] = ['cel'];
    const celInput = {
      authType: 'basic',
      configFields: {},
      needsAuthConfigBlock: false,
      program: 'program',
      redactVars: [],
      stateSettings: {},
      url: 'url',
    } as CelInput;
    createAgentInput(dataStreamPath, inputTypes, celInput);

    expect(render).toHaveBeenCalledWith(`cel_generated.yml.hbs.njk`, expect.anything());
  });
});
