/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import chalk from 'chalk';
import dedent from 'dedent';
import testSubjectToCss from '@kbn/test-subj-selector';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';
import { REPO_ROOT } from '@kbn/utils';
import { v4 as uuid } from 'uuid';

import { FtrService } from '../../ftr_provider_context';
import { AxeReport, printResult } from './axe_report';
// @ts-ignore JS that is run in browser as is
import { analyzeWithAxe, analyzeWithAxeWithClient } from './analyze_with_axe';

interface AxeContext {
  include?: string[];
  exclude?: string[][];
}

interface TestOptions {
  excludeTestSubj?: string | string[];
  skipFailures?: boolean;
}

export const normalizeResult = (report: any) => {
  if (report.error) {
    const error = new Error(report.error.message);
    error.stack = report.error.stack;
    throw report.error;
  }

  return report.result as false | AxeReport;
};

/**
 * Accessibility testing service using the Axe (https://www.deque.com/axe/)
 * toolset to validate a11y rules similar to ESLint. In order to test against
 * the rules we must load up the UI and feed a full HTML snapshot into Axe.
 */
export class AccessibilityService extends FtrService {
  private readonly browser = this.ctx.getService('browser');
  private readonly log = this.ctx.getService('log');
  private readonly Wd = this.ctx.getService('__webdriver__');

  private readonly logPath = Path.resolve(
    REPO_ROOT,
    `data/ftr_a11y_report_${process.env.BUILDKITE_JOB_ID || uuid()}.txt`
  );

  public async testAppSnapshot(options: TestOptions = {}) {
    const { excludeTestSubj, skipFailures } = options;
    const context = this.getAxeContext(true, excludeTestSubj);
    const report = await this.captureAxeReport(context);
    this.assertValidAxeReport(report, skipFailures);
  }

  public async testGlobalSnapshot(options: TestOptions = {}) {
    const { excludeTestSubj, skipFailures } = options;
    const context = this.getAxeContext(false, excludeTestSubj);
    const report = await this.captureAxeReport(context);
    this.assertValidAxeReport(report, skipFailures);
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

  private assertValidAxeReport(report: AxeReport, skipFailures?: boolean) {
    const errorMsgs = [];

    for (const result of report.violations) {
      errorMsgs.push(printResult(chalk.red('VIOLATION'), result));
    }

    if (!errorMsgs.length) {
      return;
    }

    // Throw a new Error if not skipping failures
    if (!skipFailures) {
      throw new Error(`a11y report:\n${errorMsgs.join('\n')}`);
    }

    // Append to a log file if we are skipping failures
    if (!Fs.existsSync(this.logPath)) {
      Fs.mkdirSync(Path.dirname(this.logPath), { recursive: true });
      Fs.writeFileSync(
        this.logPath,
        dedent`
          ========================================
          * A11Y REPORT MODE ONLY
          ========================================
        ` + '\n\n'
      );
    }

    this.log.warning(
      `Found ${errorMsgs.length} errors, writing them to the log file at ${this.logPath}`
    );
    Fs.writeFileSync(this.logPath, errorMsgs.join('\n\n'), {
      flag: 'a',
    });
  }

  private async captureAxeReport(context: AxeContext): Promise<AxeReport> {
    await this.Wd.driver.manage().setTimeouts({
      ...(await this.Wd.driver.manage().getTimeouts()),
      script: 600000,
    });

    const report = normalizeResult(
      await this.browser.executeAsync(analyzeWithAxe, context, AXE_CONFIG, AXE_OPTIONS)
    );

    if (report !== false) {
      return report;
    }

    const withClientReport = normalizeResult(
      await this.browser.executeAsync(analyzeWithAxeWithClient, context, AXE_CONFIG, AXE_OPTIONS)
    );

    if (withClientReport === false) {
      throw new Error('Attempted to analyze with axe but failed to load axe client');
    }

    return withClientReport;
  }
}
