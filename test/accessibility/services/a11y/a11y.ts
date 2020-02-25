/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
          .map(ts => [testSubjectToCss(ts)])
          .concat([['.ace_scrollbar']]),
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
            enabled: false,
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
