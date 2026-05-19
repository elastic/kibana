/**
 * Performs a lookup in a critical values table to determine the significance level
 * associated with a given chi-squared statistic and degrees of freedom.
 *
 * @param {number} chi2Statistic - The chi-squared statistic for which the significance level is to be determined.
 * @param {number} df - The degrees of freedom (an integer) for the chi-squared test.
 * @returns {number} The significance level corresponding to the chi-squared statistic and degrees of freedom.
 * @throws {Error} If df is less than 1 or not an integer.
 */
export declare const criticalTableLookup: (chi2Statistic: number, df: number) => number;
