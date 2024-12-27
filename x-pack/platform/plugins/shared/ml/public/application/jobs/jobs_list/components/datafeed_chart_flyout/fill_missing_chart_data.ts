/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ChartDataWithNullValues = Array<[number, number | null]>;

/**
 * Returns an array with the filled in missing timestamp values for scatterplot charts.
 * @param dataWithPossibleMissingValues - An array of arrays consisting of [timestamp, doc_count]
 * @param dataWithAllValues - An array of arrays consisting of [timestamp, doc_count]
 */
export const fillMissingChartData = (
  dataWithPossibleMissingValues: ChartDataWithNullValues,
  dataWithAllValues: ChartDataWithNullValues
): ChartDataWithNullValues => {
  const mappedData = new Map<number, number | null>(dataWithPossibleMissingValues);

  const filledData = dataWithAllValues.reduce<ChartDataWithNullValues>((acc, source) => {
    acc.push(
      mappedData.has(source[0]) ? [source[0], mappedData.get(source[0]) ?? null] : [source[0], null]
    );
    return acc;
  }, []);

  return filledData;
};
