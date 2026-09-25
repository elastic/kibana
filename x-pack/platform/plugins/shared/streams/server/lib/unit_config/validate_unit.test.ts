/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import { validateUnitForWrite } from './validate_unit';

const unit: StreamsUnit.Configuration = {
  sources: [
    {
      id: 'otlp-input',
      type: 'nop',
      supported_telemetry: ['logs'],
    },
  ],
  destinations: [
    {
      id: 'es-prod',
      type: 'debug',
      supported_telemetry: ['logs'],
    },
  ],
  pipelines: [
    {
      id: 'main',
      supported_telemetry: ['logs'],
      config: [
        { name: 'sources', value: ['otlp-input'] },
        { name: 'destinations', value: ['es-prod'] },
      ],
    },
  ],
};

describe('validateUnitForWrite', () => {
  it('delegates duplicate ids to the distributor hook', async () => {
    const validate = jest.fn().mockResolvedValue({});
    const withDuplicate: StreamsUnit.Configuration = {
      ...unit,
      destinations: [{ id: 'otlp-input', type: 'debug', supported_telemetry: ['logs'] }],
    };

    await validateUnitForWrite(withDuplicate, { validate });

    expect(validate).toHaveBeenCalledWith(withDuplicate);
  });

  it('delegates semantic validation to the injected distributor hook', async () => {
    const validate = jest.fn().mockRejectedValue(new StatusError('OTTL parse error', 400));

    await expect(validateUnitForWrite(unit, { validate })).rejects.toMatchObject({
      message: 'OTTL parse error',
      statusCode: 400,
    });
    expect(validate).toHaveBeenCalledWith(unit);
  });

  it('still calls the distributor hook for incomplete units', async () => {
    const validate = jest.fn().mockResolvedValue({});
    const incomplete: StreamsUnit.Configuration = {
      sources: unit.sources,
      destinations: [],
      pipelines: [],
    };

    await validateUnitForWrite(incomplete, { validate });

    expect(validate).toHaveBeenCalledWith(incomplete);
  });

  it('returns compiled_config from the distributor hook', async () => {
    const validate = jest.fn().mockResolvedValue({ compiled_config: 'receivers: {}' });

    await expect(validateUnitForWrite(unit, { validate })).resolves.toEqual({
      compiled_config: 'receivers: {}',
    });
  });
});
