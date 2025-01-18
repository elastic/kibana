/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as table from 'table';
import chalk from 'chalk';
import type { TableUserConfig } from 'table';
import type { EvaluationResult } from './types';

interface ResultRenderer {
  render: (params: { result: EvaluationResult }) => string;
}

export const createResultRenderer = (): ResultRenderer => {
  const config = {
    ...baseConfig,
    spanningCells: [
      { row: 0, col: 0, colSpan: 3 },
      { row: 1, col: 0, colSpan: 3 },
    ],
    columns: [{ wrapWord: true, width: 60 }, { wrapWord: true }, { wrapWord: true, width: 60 }],
  };
  const header = [chalk.bold('Criterion'), chalk.bold('Result'), chalk.bold('Reasoning')];

  return {
    render: ({ result }) => {
      const rows: string[][] = [[sanitize(result.input), '', ''], ['', '', ''], header];
      result.scores.forEach((score) => {
        rows.push([
          sanitize(score.criterion),
          score.score < 1
            ? chalk.redBright(String(score.score))
            : chalk.greenBright(String(score.score)),
          sanitize(score.reasoning),
        ]);
      });
      return table.table(rows, config);
    },
  };
};

export const renderFailedScenarios = (failedScenario: EvaluationResult[]): string => {
  const config = {
    ...baseConfig,
    spanningCells: [],
    columns: [{ wrapWord: true, width: 60 }, { wrapWord: true }, { wrapWord: true, width: 60 }],
  };
  const rows: string[][] = [
    ['Failed Tests', '', ''],
    ['Scenario', 'Scores', 'Reasoning'],
  ];

  failedScenario.forEach((result) => {
    const totalResults = result.scores.length;
    const failedResults = result.scores.filter((score) => score.score < 1).length;

    const reasoningConcat = result.scores.map((score) => sanitize(score.reasoning)).join(' ');
    rows.push([
      `${result.name}`,
      `Average score ${Math.round(
        (result.scores.reduce((total, next) => total + next.score, 0) * 100) / totalResults
      )}. Failed ${failedResults} tests out of ${totalResults}`,
      `Reasoning: ${reasoningConcat}`,
    ]);
  });

  return table.table(rows, config);
};

const baseConfig: TableUserConfig = {
  singleLine: false,
  border: {
    topBody: `─`,
    topJoin: `┬`,
    topLeft: `┌`,
    topRight: `┐`,

    bottomBody: `─`,
    bottomJoin: `┴`,
    bottomLeft: `└`,
    bottomRight: `┘`,

    bodyLeft: `│`,
    bodyRight: `│`,
    bodyJoin: `│`,

    joinBody: `─`,
    joinLeft: `├`,
    joinRight: `┤`,
    joinJoin: `┼`,
  },
};

const sanitize = (text: string) => {
  // table really doesn't like leading whitespaces and empty lines...
  return text.replace(/^ +/gm, '').replace(/ +$/gm, '').replace(/^\n+/g, '').replace(/\n+$/g, '');
};
