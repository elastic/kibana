export type ChartDataWithNullValues = Array<[number, number | null]>;
/**
 * Returns an array with the filled in missing timestamp values for scatterplot charts.
 * @param dataWithPossibleMissingValues - An array of arrays consisting of [timestamp, doc_count]
 * @param dataWithAllValues - An array of arrays consisting of [timestamp, doc_count]
 */
export declare const fillMissingChartData: (dataWithPossibleMissingValues: ChartDataWithNullValues, dataWithAllValues: ChartDataWithNullValues) => ChartDataWithNullValues;
