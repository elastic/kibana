/**
 * Table generated from following python code

import scipy.stats as stats
import numpy as np

# generate a chi-squared critical value table

# degrees of freedom
df = range(1,100)

# levels of significance
significance_levels = np.concatenate((np.logspace(-6, -3, 3), np.linspace(0.01, 0.99, 99)))

# create the table
table = []
for d in df:
    row = []
    for l in significance_levels:
        row.append(round(stats.chi2.ppf(1 - l, d), 2))
    table.append(row)

critical_value_table = np.array(table)

# print the critical value table as a TypeScipt array
print("export const CRITICAL_VALUES_TABLE = [")
for row in critical_value_table:
    print(f"  [{', '.join([str(x) for x in row])}],")
print("];")

# print the significance levels as a TypeScript array
print("export const SIGNIFICANCE_LEVELS = [")
print(f"  {', '.join([f'{x:.6f}' for x in significance_levels])}")
print("];")

 * until we find a low size replacement for doing chi2test in js
 */
export declare const CRITICAL_VALUES_TABLE: number[][];
/**
 * Signifance levels used by `computeChi2PValue`.
 */
export declare const SIGNIFICANCE_LEVELS: number[];
