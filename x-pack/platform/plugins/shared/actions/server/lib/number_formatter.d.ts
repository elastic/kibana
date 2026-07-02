import type { Logger } from '@kbn/core/server';
/**
 * Takes a string which contains a number and formatting options,
 * and returns that string formatted according to the options.
 * Intl.FormatNumber is used for formatting.
 *
 * The format is 'number; locales; options', where
 * - `number` is the number to format
 * - `locales` is a comma-separated list of locales
 * - `options` is a comma-separated list of Intl.NumberFormat options
 *
 * Both semicolons are required , but the `locales` and `options` can
 * be empty. If `locales` is empty, `en-US` is used, for consistency.
 *
 * Examples:
 *   `1234.567; en-US; style: currency, currency: USD`
 *   `1234.567;; style: currency, currency: USD`
 *   `1234.567;;`
 *
 * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat
 *
 * @param numberAndFormat string containing a number and formatting options
 * @returns number formatted according to the options
 */
export declare function formatNumber(logger: Logger, numberLocalesOptions: string): string;
