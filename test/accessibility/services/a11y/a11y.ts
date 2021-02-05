/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import testSubjectToCss from '@kbn/test-subj-selector';

import { FtrProviderContext } from '../../ftr_provider_context';
import { AxeReport, printResult } from './axe_report';
// @ts-ignore JS that is run in browser as is
import { analyzeWithAxe, analyzeWithAxeWithClient } from './analyze_with_axe';

interface AxeContext {
  include?: string[];
  exclude?: string[][];
}

interface TestOptions {
  excludeTestSubj?: string | string[];
}

export const normalizeResult = (report: any) => {
  if (report.error) {
    const error = new Error(report.error.message);
    error.stack = report.error.stack;
    throw report.error;
  }

  return report.result as false | AxeReport;
};

export function A11yProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const Wd = getService('__webdriver__');

  /**
   * Accessibility testing service using the Axe (https://www.deque.com/axe/)
   * toolset to validate a11y rules similar to ESLint. In order to test against
   * the rules we must load up the UI and feed a full HTML snapshot into Axe.
   */
  return new (class Accessibility {
    public async testAppSnapshot(options: TestOptions = {}) {
      const context = this.getAxeContext(true, options.excludeTestSubj);
      const report = await this.captureAxeReport(context);
      await this.testAxeReport(report);
    }

    public async testGlobalSnapshot(options: TestOptions = {}) {
      const context = this.getAxeContext(false, options.excludeTestSubj);
      const report = await this.captureAxeReport(context);
      await this.testAxeReport(report);
    }

    private getAxeContext(global: boolean, excludeTestSubj?: string | string[]): AxeContext {
      return {
        include: global ? undefined : [testSubjectToCss('appA11yRoot')],
        exclude: ([] as string[])
          .concat(excludeTestSubj || [])
          .map((ts) => [testSubjectToCss(ts)])
          .concat([['[role="graphics-document"][aria-roledescription="visualization"]']]),
      };
    }

    private testAxeReport(report: AxeReport) {
      const errorMsgs = [];

      for (const result of report.violations) {
        errorMsgs.push(printResult(chalk.red('VIOLATION'), result));
      }

      if (errorMsgs.length) {
        throw new Error(`a11y report:\n${errorMsgs.join('\n')}`);
      }
    }

    private async captureAxeReport(context: AxeContext): Promise<AxeReport> {
      const axeOptions = {
        reporter: 'v2',
        runOnly: ['wcag2a', 'wcag2aa'],
        rules: {
          'color-contrast': {
            enabled: false, // disabled because we have too many failures
          },
          bypass: {
            enabled: false, // disabled because it's too flaky
          },
        },
      };

      await (Wd.driver.manage() as any).setTimeouts({
        ...(await (Wd.driver.manage() as any).getTimeouts()),
        script: 600000,
      });

      const report = normalizeResult(
        await browser.executeAsync(analyzeWithAxe, context, axeOptions)
      );

      if (report !== false) {
        return report;
      }

      const withClientReport = normalizeResult(
        await browser.executeAsync(analyzeWithAxeWithClient, context, axeOptions)
      );

      if (withClientReport === false) {
        throw new Error('Attempted to analyze with axe but failed to load axe client');
      }

      return withClientReport;
    }
  })();
}
