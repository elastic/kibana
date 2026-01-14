/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseParams } from '@kbn/reporting-common/types';
import { idSchema, validateJobParams } from './validator';

describe('validateJobParams', () => {
  it('accepts valid job params', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00Z',
    };

    expect(() => validateJobParams(validParams)).not.toThrow();
  });

  it('accepts valid csv job params', () => {
    const validParams = {
      browserTimezone: 'America/Los_Angeles',
      isEsqlMode: true,
      objectType: 'search',
      title: 'Discover session',
      version: '9.4.0',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).not.toThrow();
  });

  it('sanitizes title', () => {
    const validParams = {
      title: 'Monthly Report<script>alert("xss")</script>',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00Z',
    };

    const result = validateJobParams(validParams);
    expect(result.title).toBe('Monthly Report');
  });

  it('sanitizes objectType', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard<script>alert("xss")</script>',
      forceNow: '2024-01-01T00:00:00Z',
    };

    const result = validateJobParams(validParams);
    expect(result.objectType).toBe('dashboard');
  });

  it('sanitizes version', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0<script>alert("")</script>',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00Z',
    };

    const result = validateJobParams(validParams);
    expect(result.version).toBe('8.0.0');
  });

  it('sanitizes forceNow', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00<script/>',
    };

    const result = validateJobParams(validParams);
    expect(result.forceNow).toBe('2024-01-01T00:00:00');
  });

  it('validates timezone', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'invalid/timezone',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    };

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"custom\\",
          \\"message\\": \\"Invalid timezone\\",
          \\"path\\": [
            \\"browserTimezone\\"
          ]
        }
      ]"
    `);
  });

  it('validates objectType', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: true,
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"boolean\\",
          \\"path\\": [
            \\"objectType\\"
          ],
          \\"message\\": \\"Expected string, received boolean\\"
        }
      ]"
    `);
  });

  it('validates title', () => {
    const validParams = {
      title: true,
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"boolean\\",
          \\"path\\": [
            \\"title\\"
          ],
          \\"message\\": \\"Expected string, received boolean\\"
        }
      ]"
    `);
  });

  it('validates version', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0 very long version that exceeds the maximum length of thirty-two characters',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"too_big\\",
          \\"maximum\\": 32,
          \\"type\\": \\"string\\",
          \\"inclusive\\": true,
          \\"exact\\": false,
          \\"message\\": \\"String must contain at most 32 character(s)\\",
          \\"path\\": [
            \\"version\\"
          ]
        }
      ]"
    `);
  });

  it('validates forceNow', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: 'very long version that exceeds the maximum length of thirty-two characters',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"too_big\\",
          \\"maximum\\": 32,
          \\"type\\": \\"string\\",
          \\"inclusive\\": true,
          \\"exact\\": false,
          \\"message\\": \\"String must contain at most 32 character(s)\\",
          \\"path\\": [
            \\"forceNow\\"
          ]
        }
      ]"
    `);
  });

  it('validates pagingStrategy', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
      pagingStrategy: 'invalid_strategy',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"received\\": \\"invalid_strategy\\",
          \\"code\\": \\"invalid_enum_value\\",
          \\"options\\": [
            \\"pit\\",
            \\"scroll\\"
          ],
          \\"path\\": [
            \\"pagingStrategy\\"
          ],
          \\"message\\": \\"Invalid enum value. Expected 'pit' | 'scroll', received 'invalid_strategy'\\"
        }
      ]"
    `);
  });

  it('validates layout', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: 'invalid-id', dimensions: { width: 800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"received\\": \\"invalid-id\\",
          \\"code\\": \\"invalid_enum_value\\",
          \\"options\\": [
            \\"preserve_layout\\",
            \\"print\\",
            \\"canvas\\",
            \\"png\\"
          ],
          \\"path\\": [
            \\"layout\\",
            \\"id\\"
          ],
          \\"message\\": \\"Invalid enum value. Expected 'preserve_layout' | 'print' | 'canvas' | 'png', received 'invalid-id'\\"
        }
      ]"
    `);
  });

  it('validates layout width', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: { id: idSchema.Enum.print, dimensions: { width: -800, height: 600 } },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"too_small\\",
          \\"minimum\\": 0,
          \\"type\\": \\"number\\",
          \\"inclusive\\": false,
          \\"exact\\": false,
          \\"message\\": \\"Number must be greater than 0\\",
          \\"path\\": [
            \\"layout\\",
            \\"dimensions\\",
            \\"width\\"
          ]
        }
      ]"
    `);
  });

  it('validates layout unknown fields', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: {
        id: idSchema.Enum.print,
        dimensions: { width: 800, height: 600 },
        unknownField: 'value',
      },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"unrecognized_keys\\",
          \\"keys\\": [
            \\"unknownField\\"
          ],
          \\"path\\": [
            \\"layout\\"
          ],
          \\"message\\": \\"Unrecognized key(s) in object: 'unknownField'\\"
        }
      ]"
    `);
  });

  it('validates layout dimensions unknown fields', () => {
    const validParams = {
      title: 'Monthly Report',
      version: '8.0.0',
      layout: {
        id: idSchema.Enum.print,
        dimensions: { width: 800, height: 600, unknownField: 'value' },
      },
      browserTimezone: 'UTC',
      objectType: 'dashboard',
      forceNow: '2024-01-01T00:00:00',
    } as unknown as BaseParams;

    expect(() => validateJobParams(validParams)).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"unrecognized_keys\\",
          \\"keys\\": [
            \\"unknownField\\"
          ],
          \\"path\\": [
            \\"layout\\",
            \\"dimensions\\"
          ],
          \\"message\\": \\"Unrecognized key(s) in object: 'unknownField'\\"
        }
      ]"
    `);
  });
});
