/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '@kbn/evals';
import { table } from 'table';
import chalk from 'chalk';

evaluate.describe(
  'OneChat Evaluation Results and Historical Analysis',
  { tag: '@svlSearch' },
  () => {
    // Run-to-Run Comparison
    evaluate('Evaluation Run Comparison', async ({ evaluationAnalysisService, log }) => {
      const currentRunId = process.env.EVALUATION_RUN_ID;
      const referenceRunId = process.env.REFERENCE_EVALUATION_RUN_ID;

      if (!currentRunId || !referenceRunId) {
        log.warning(
          '⚠️ Skipping run comparison: EVALUATION_RUN_ID and/or REFERENCE_EVALUATION_RUN_ID environment variables not set'
        );
        log.info('To use this feature, set:');
        log.info('  - EVALUATION_RUN_ID: ID of the current evaluation run');
        log.info(
          '  - REFERENCE_EVALUATION_RUN_ID: ID of the reference evaluation run to compare against'
        );
        return;
      }

      log.info('🔄 === EVALUATION RUN COMPARISON ===');
      log.info(`Current Run ID: ${chalk.cyan(currentRunId)}`);
      log.info(`Reference Run ID: ${chalk.cyan(referenceRunId)}`);

      try {
        const comparisonResult = await evaluationAnalysisService.compareEvaluationRuns({
          currentRunId,
          referenceRunId,
        });

        const { comparison, summary, metadata } = comparisonResult;

        // Display metadata
        log.info(`\n${chalk.bold.blue('📋 Run Metadata:')}`);
        log.info(
          `Current Run: ${chalk.cyan(metadata.currentRun.runId)} (${
            metadata.currentRun.timestamp || 'Unknown time'
          }) - Model: ${chalk.yellow(metadata.currentRun.model || 'Unknown')}`
        );
        log.info(
          `Reference Run: ${chalk.cyan(metadata.referenceRun.runId)} (${
            metadata.referenceRun.timestamp || 'Unknown time'
          }) - Model: ${chalk.yellow(metadata.referenceRun.model || 'Unknown')}`
        );

        if (comparison.length > 0) {
          // Group comparisons by dataset for better readability
          const comparisonsByDataset = comparison.reduce((acc, comp) => {
            if (!acc[comp.dataset]) {
              acc[comp.dataset] = [];
            }
            acc[comp.dataset].push(comp);
            return acc;
          }, {} as Record<string, typeof comparison>);

          for (const [dataset, comps] of Object.entries(comparisonsByDataset)) {
            const datasetDisplayName = dataset.replace('onechat: default-agent-', '');

            log.info(`\n${chalk.bold.cyan(`📈 ${datasetDisplayName} Performance Comparison:`)}`);

            const comparisonHeaders = [
              'Evaluator',
              'Current',
              'Reference',
              'Difference',
              '% Change',
              'Status',
            ];
            const comparisonData = comps.map((comp) => {
              const statusIcon = comp.isImprovement
                ? chalk.green('📈 IMPROVED')
                : comp.difference < -0.001
                ? chalk.red('📉 DECLINED')
                : chalk.yellow('➡️ SAME');

              const differenceText =
                comp.difference > 0
                  ? chalk.green(`+${comp.difference.toFixed(3)}`)
                  : comp.difference < 0
                  ? chalk.red(comp.difference.toFixed(3))
                  : chalk.yellow('0.000');

              const percentageText =
                comp.percentageChange > 0
                  ? chalk.green(`+${comp.percentageChange.toFixed(1)}%`)
                  : comp.percentageChange < 0
                  ? chalk.red(`${comp.percentageChange.toFixed(1)}%`)
                  : chalk.yellow('0.0%');

              return [
                chalk.bold.white(comp.evaluator),
                chalk.cyan(comp.currentScore.toFixed(3)),
                chalk.gray(comp.referenceScore.toFixed(3)),
                differenceText,
                percentageText,
                statusIcon,
              ];
            });

            const comparisonTable = table([comparisonHeaders, ...comparisonData], {
              columns: {
                0: { alignment: 'left' },
                1: { alignment: 'right' },
                2: { alignment: 'right' },
                3: { alignment: 'right' },
                4: { alignment: 'right' },
                5: { alignment: 'left' },
              },
            });

            log.info(`\n${comparisonTable}`);
          }

          // Overall performance summary
          const improvementRate = (summary.improvements / summary.totalComparisons) * 100;
          const regressionRate = (summary.regressions / summary.totalComparisons) * 100;

          log.info(`\n${chalk.bold.blue('🎯 Overall Performance Analysis:')}`);

          if (improvementRate > regressionRate) {
            log.info(`${chalk.green('✅ Current run shows overall improvement!')}`);
            log.info(
              `  • ${chalk.green(
                `${summary.improvements}/${summary.totalComparisons}`
              )} metrics improved (${chalk.green(improvementRate.toFixed(1) + '%')})`
            );
          } else if (regressionRate > improvementRate) {
            log.info(`${chalk.red('❌ Current run shows overall regression.')}`);
            log.info(
              `  • ${chalk.red(
                `${summary.regressions}/${summary.totalComparisons}`
              )} metrics declined (${chalk.red(regressionRate.toFixed(1) + '%')})`
            );
          } else {
            log.info(`${chalk.yellow('⚖️  Current run shows mixed results.')}`);
            log.info(`  • Equal improvements and regressions`);
          }
        } else {
          log.warning(
            '❌ No matching datasets/evaluators found between the two runs for comparison'
          );
        }
      } catch (error) {
        log.error(`❌ Failed to compare evaluation runs: ${error.message}`);
        throw error;
      }
    });
  }
);
