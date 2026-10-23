/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { S3DataSourceWithSecrets } from '../../../../common/datasource_types';
import { authFormatSettingsByDataSourceType } from '../../../../public/create_data_source_flyout/auth_format_settings';
import { putDataSourceBodySchema } from '../../../../server/routes/data_sources/data_source_schema';

// S3 settings Elasticsearch accepts that Kibana deliberately doesn't expose.
const INTENTIONALLY_UNSUPPORTED_S3_SETTINGS = ['session_token'];

const KNOWN_SETTINGS_REGEX = /known settings: \[([^\]]*)\]/;

const getErrorReason = (error: unknown): string => {
  const reason = error instanceof errors.ResponseError ? error.body?.error?.reason : undefined;
  return typeof reason === 'string' ? reason : String(error);
};

const isRejectedByKibanaSchema = (setting: string): boolean => {
  try {
    putDataSourceBodySchema.validate({
      type: 's3',
      description: '',
      settings: { [setting]: 'x' },
    });
    return false;
  } catch {
    return true;
  }
};

apiTest.describe(
  'ES|QL Data Federation — S3 data source settings contract with Elasticsearch',
  { tag: tags.stateful.classic },
  () => {
    apiTest('Kibana supports every S3 setting Elasticsearch knows', async ({ esClient }) => {
      // An unknown setting makes Elasticsearch list every setting it accepts. Validation fails,
      // so nothing is created.
      let reason = '';
      try {
        await esClient.transport.request({
          method: 'PUT',
          path: '/_query/data_source/scout-settings-contract-s3',
          body: { type: 's3', description: '', settings: { not_a_real_setting: 'x' } },
        });
      } catch (error) {
        reason = getErrorReason(error);
      }

      const knownSettings = reason.match(KNOWN_SETTINGS_REGEX)?.[1] ?? '';
      expect(knownSettings).not.toBe('');
      const esSettings = knownSettings.split(',').map((setting) => setting.trim());
      const expectedUnsupported = [...INTENTIONALLY_UNSUPPORTED_S3_SETTINGS].sort();

      await apiTest.step('the Kibana API accepts them', async () => {
        // The Kibana route schema rejects unknown keys.
        const rejectedByKibana = esSettings.filter(isRejectedByKibanaSchema);

        expect(rejectedByKibana.sort()).toStrictEqual(expectedUnsupported);
      });

      await apiTest.step('the client sends them', async () => {
        // Run a data source with every setting through each auth mode's formatter and collect
        // what the client would submit.
        const dataSource: S3DataSourceWithSecrets = {
          type: 's3',
          name: 'contract',
          description: '',
          settings: Object.fromEntries(esSettings.map((setting) => [setting, 'x'])),
        };

        const sentByClient = new Set(
          Object.values(authFormatSettingsByDataSourceType.s3).flatMap((formatSettings) =>
            Object.keys(formatSettings(dataSource))
          )
        );
        const notSentByClient = esSettings.filter((setting) => !sentByClient.has(setting));

        expect(notSentByClient.sort()).toStrictEqual(expectedUnsupported);
      });
    });
  }
);
