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
};

describe('validateUnitForWrite', () => {
  it('rejects duplicate ids before calling the distributor hook', async () => {
    const validate = jest.fn();

    await expect(
      validateUnitForWrite(
        {
          ...unit,
          destinations: [{ id: 'otlp-input', type: 'debug', supported_telemetry: ['logs'] }],
        },
        { validate }
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      data: { duplicate_ids: ['otlp-input'] },
    });
    expect(validate).not.toHaveBeenCalled();
  });

  it('delegates semantic validation to the injected distributor hook', async () => {
    const validate = jest.fn().mockRejectedValue(new StatusError('OTTL parse error', 400));

    await expect(validateUnitForWrite(unit, { validate })).rejects.toMatchObject({
      message: 'OTTL parse error',
      statusCode: 400,
    });
    expect(validate).toHaveBeenCalledWith(unit);
  });
});
