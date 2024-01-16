/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Page } from 'playwright';
import { ToolingLog } from '@kbn/tooling-log';

export const getPerformanceMetrics = async (executeSteps: () => void, page: Page) => {
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');

  await executeSteps();

  const performanceMetrics = await session.send('Performance.getMetrics');

  const perfMetrics = performanceMetrics.metrics.map((metric) => ({
    [metric.name]: metric.value,
  }));

  return perfMetrics;
};

export const logPerformanceMetrics = async (
  stepName: string,
  executeSteps: () => void,
  page: Page,
  log: ToolingLog
) => {
  const metrics = await getPerformanceMetrics(executeSteps, page);
  log.info({
    type: 'Performance',
    description: `${stepName}`,
    metrics,
  });
};
