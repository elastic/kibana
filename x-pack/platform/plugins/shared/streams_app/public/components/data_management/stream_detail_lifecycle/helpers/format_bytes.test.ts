/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatBytes, formatIngestionRate } from './format_bytes';

// Mock formatNumber from @elastic/eui
jest.mock('@elastic/eui', () => ({
  formatNumber: jest.fn((value: number, format: string) => {
    if (format === '0.0 b') {
      // Simulate EUI's byte formatting behavior
      if (value === 0) return '0 B';
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
      if (value < 1024 * 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      if (value < 1024 * 1024 * 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
      if (value < 1024 * 1024 * 1024 * 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024 * 1024 * 1024)).toFixed(1)} PB`;
      return `${(value / (1024 * 1024 * 1024 * 1024 * 1024 * 1024)).toFixed(1)} EB`;
    }
    return value.toString();
  }),
}));

describe('format_bytes', () => {
  describe('formatBytes', () => {
    describe('Bytes', () => {
      it('formats bytes correctly', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1)).toBe('1 B');
        expect(formatBytes(512)).toBe('512 B');
        expect(formatBytes(1023)).toBe('1023 B');
      });
    });

    describe('Kilobytes', () => {
      it('formats kilobytes correctly', () => {
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(1536)).toBe('1.5 KB'); // 1.5 * 1024
        expect(formatBytes(2048)).toBe('2.0 KB'); // 2 * 1024
        expect(formatBytes(1024 * 10)).toBe('10.0 KB');
        expect(formatBytes(1024 * 100)).toBe('100.0 KB');
        expect(formatBytes(1024 * 1023)).toBe('1023.0 KB');
      });

      it('handles fractional kilobytes', () => {
        expect(formatBytes(1024 + 256)).toBe('1.3 KB'); // 1.25 * 1024 rounded to 1 decimal
        expect(formatBytes(1024 + 512)).toBe('1.5 KB'); // 1.5 * 1024
        expect(formatBytes(1024 + 768)).toBe('1.8 KB'); // 1.75 * 1024 rounded to 1 decimal
      });
    });

    describe('Megabytes', () => {
      it('formats megabytes correctly', () => {
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
        expect(formatBytes(1024 * 1024 * 2)).toBe('2.0 MB');
        expect(formatBytes(1024 * 1024 * 10)).toBe('10.0 MB');
        expect(formatBytes(1024 * 1024 * 100)).toBe('100.0 MB');
        expect(formatBytes(1024 * 1024 * 1023)).toBe('1023.0 MB');
      });

      it('handles fractional megabytes', () => {
        expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
        expect(formatBytes(1024 * 1024 * 2.75)).toBe('2.8 MB'); // Rounded to 1 decimal
        expect(formatBytes(1024 * 1024 * 0.5)).toBe('0.5 MB');
      });
    });

    describe('Gigabytes', () => {
      it('formats gigabytes correctly', () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
        expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe('2.0 GB');
        expect(formatBytes(1024 * 1024 * 1024 * 10)).toBe('10.0 GB');
        expect(formatBytes(1024 * 1024 * 1024 * 100)).toBe('100.0 GB');
      });

      it('handles fractional gigabytes', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1.5)).toBe('1.5 GB');
        expect(formatBytes(1024 * 1024 * 1024 * 2.25)).toBe('2.3 GB'); // Rounded to 1 decimal
        expect(formatBytes(1024 * 1024 * 1024 * 0.75)).toBe('0.8 GB'); // Rounded to 1 decimal
      });
    });

    describe('Terabytes', () => {
      it('formats terabytes correctly', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 2)).toBe('2.0 TB');
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 10)).toBe('10.0 TB');
      });

      it('handles fractional terabytes', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1.5)).toBe('1.5 TB');
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 0.25)).toBe('0.3 TB'); // Rounded to 1 decimal
      });
    });

    describe('Petabytes and Beyond', () => {
      it('formats petabytes correctly', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.0 PB');
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024 * 2.5)).toBe('2.5 PB');
      });

      it('formats exabytes correctly', () => {
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.0 EB');
        expect(formatBytes(1024 * 1024 * 1024 * 1024 * 1024 * 1024 * 3)).toBe('3.0 EB');
      });
    });

    describe('Edge Cases', () => {
      it('handles negative numbers', () => {
        expect(formatBytes(-1)).toBe('-1 B');
        expect(formatBytes(-1024)).toBe('-1.0 KB');
        expect(formatBytes(-1024 * 1024)).toBe('-1.0 MB');
      });

      it('handles very large numbers', () => {
        const largeNumber = Number.MAX_SAFE_INTEGER;
        const result = formatBytes(largeNumber);
        expect(result).toMatch(/\d+\.\d+ [KMGTPE]B$/); // Should format to some unit
      });

      it('handles decimal inputs', () => {
        expect(formatBytes(1024.5)).toBe('1.0 KB'); // Should handle fractional bytes
        expect(formatBytes(1536.7)).toBe('1.5 KB');
        expect(formatBytes(1048576.3)).toBe('1.0 MB');
      });
    });

    describe('Precision and Rounding', () => {
      it('rounds to 1 decimal place consistently', () => {
        expect(formatBytes(1024 * 1.11)).toBe('1.1 KB'); // 1.11 rounds to 1.1
        expect(formatBytes(1024 * 1.15)).toBe('1.2 KB'); // 1.15 rounds to 1.2
        expect(formatBytes(1024 * 1.14)).toBe('1.1 KB'); // 1.14 rounds to 1.1
        expect(formatBytes(1024 * 1.16)).toBe('1.2 KB'); // 1.16 rounds to 1.2
      });

      it('handles exact values without unnecessary decimals', () => {
        expect(formatBytes(1024)).toBe('1.0 KB');
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      });
    });

    describe('Real-World Examples', () => {
      it('formats common file sizes', () => {
        expect(formatBytes(1024)).toBe('1.0 KB'); // Small config file
        expect(formatBytes(1024 * 100)).toBe('100.0 KB'); // Medium text file
        expect(formatBytes(1024 * 1024 * 5)).toBe('5.0 MB'); // Photo
        expect(formatBytes(1024 * 1024 * 700)).toBe('700.0 MB'); // CD size
        expect(formatBytes(1024 * 1024 * 1024 * 4.7)).toBe('4.7 GB'); // DVD size
      });

      it('formats common data stream sizes', () => {
        expect(formatBytes(1024 * 1024 * 10)).toBe('10.0 MB'); // Small index
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB'); // Medium index
        expect(formatBytes(1024 * 1024 * 1024 * 50)).toBe('50.0 GB'); // Large index
        expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB'); // Very large index
      });
    });

    describe('Boundary Values', () => {
      it('handles boundary values between units correctly', () => {
        expect(formatBytes(1023)).toBe('1023 B'); // Just below 1 KB
        expect(formatBytes(1024)).toBe('1.0 KB'); // Exactly 1 KB
        expect(formatBytes(1025)).toBe('1.0 KB'); // Just above 1 KB

        expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB'); // Just below 1 MB
        expect(formatBytes(1024 * 1024)).toBe('1.0 MB'); // Exactly 1 MB
        expect(formatBytes(1024 * 1024 + 1)).toBe('1.0 MB'); // Just above 1 MB
      });
    });

    describe('Performance Considerations', () => {
      it('handles zero efficiently', () => {
        expect(formatBytes(0)).toBe('0 B');
      });

      it('handles small numbers efficiently', () => {
        for (let i = 1; i < 1024; i++) {
          const result = formatBytes(i);
          expect(result).toBe(`${i} B`);
        }
      });
    });

    describe('Input Validation', () => {
      it('handles NaN input', () => {
        expect(formatBytes(NaN)).toBe('NaN B');
      });

      it('handles Infinity input', () => {
        expect(formatBytes(Infinity)).toBe('Infinity B');
        expect(formatBytes(-Infinity)).toBe('-Infinity B');
      });

      it('handles null and undefined as numbers', () => {
        expect(formatBytes(null as any)).toBe('0 B'); // null coerces to 0
        expect(formatBytes(undefined as any)).toBe('NaN B'); // undefined coerces to NaN
      });
    });
  });

  describe('formatIngestionRate', () => {
    describe('Default Behavior (per day and per month)', () => {
      it('formats daily and monthly rates correctly', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDayPerMonth') {
            return `${options.values.perDay} / Day (${options.values.perMonth} / Month)`;
          }
          return key;
        });

        const result = formatIngestionRate(1024 * 1024); // 1 MB per day
        expect(result).toBe('1.0 MB / Day (30.0 MB / Month)');
      });

      it('handles various daily rates', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDayPerMonth') {
            return `${options.values.perDay} / Day (${options.values.perMonth} / Month)`;
          }
          return key;
        });

        const testCases = [
          { bytes: 1024, expected: '1.0 KB / Day (30.0 KB / Month)' },
          { bytes: 1024 * 1024 * 5, expected: '5.0 MB / Day (150.0 MB / Month)' },
          { bytes: 1024 * 1024 * 1024, expected: '1.0 GB / Day (30.0 GB / Month)' },
        ];

        testCases.forEach(({ bytes, expected }) => {
          const result = formatIngestionRate(bytes);
          expect(result).toBe(expected);
        });
      });
    });

    describe('Per Day Only Mode', () => {
      it('formats only daily rate when perDayOnly is true', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDay') {
            return `${options.values.perDay} / Day`;
          }
          return key;
        });

        const result = formatIngestionRate(1024 * 1024, true); // 1 MB per day, per day only
        expect(result).toBe('1.0 MB / Day');
      });

      it('handles various daily rates in per day only mode', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDay') {
            return `${options.values.perDay} / Day`;
          }
          return key;
        });

        const testCases = [
          { bytes: 1024, expected: '1.0 KB / Day' },
          { bytes: 1024 * 1024 * 2, expected: '2.0 MB / Day' },
          { bytes: 1024 * 1024 * 1024 * 0.5, expected: '512.0 MB / Day' },
        ];

        testCases.forEach(({ bytes, expected }) => {
          const result = formatIngestionRate(bytes, true);
          expect(result).toBe(expected);
        });
      });
    });

    describe('Edge Cases', () => {
      it('handles zero bytes correctly', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDayPerMonth') {
            return `${options.values.perDay} / Day (${options.values.perMonth} / Month)`;
          }
          return key;
        });

        const result = formatIngestionRate(0);
        expect(result).toBe('0 B / Day (0 B / Month)');
      });

      it('handles negative values', () => {
        const mockI18n = require('@kbn/i18n');
        mockI18n.i18n.translate = jest.fn((key, options) => {
          if (key === 'xpack.streams.streamDetailOverview.ingestionRatePerDayPerMonth') {
            return `${options.values.perDay} / Day (${options.values.perMonth} / Month)`;
          }
          return key;
        });

        const result = formatIngestionRate(-1024);
        expect(result).toBe('-1.0 KB / Day (-30.0 KB / Month)');
      });
    });
  });
});