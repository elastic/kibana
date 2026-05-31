/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from:
//   x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/connectors/with_email_aws_ses_kbn_config/email.ts
//
// 1 of 1 tests migrated.
// Requires --xpack.actions.email.services.ses.host and
// --xpack.actions.email.services.ses.port (set in the email_aws_ses Scout
// config set).

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';

const AWS_SES_HOST = 'email-fips.ca-central-1.amazonaws.com';
const AWS_SES_PORT = '25439';

test.describe(
  'Email connector — AWS SES Kibana config',
  {
    tag: tags.stateful.classic,
  },
  () => {
    test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(kbnUrl.get(CONNECTORS_APP_PATH));
    });

    test('should use the kibana config for aws ses', async ({ page }) => {
      await page.testSubj.click('createConnectorButton');
      await page.testSubj.click('.email-card');
      await page.testSubj.locator('emailServiceSelectInput').selectOption('ses');

      await expect(page.testSubj.locator('emailHostInput')).toHaveValue(AWS_SES_HOST, {
        timeout: 10_000,
      });
      await expect(page.testSubj.locator('emailPortInput')).toHaveValue(AWS_SES_PORT);
      await expect(page.testSubj.locator('emailSecureSwitch')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
  }
);
