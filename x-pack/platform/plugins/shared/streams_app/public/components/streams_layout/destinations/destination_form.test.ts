/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { canSubmitDestinationForm, getDestinationCreationFormErrors } from './destination_form';
import type { DestinationCreationFormData } from './types';
import { EMPTY_ELASTICSEARCH_DESTINATION_FORM, EMPTY_S3_DESTINATION_FORM } from './types';

const unitDefinition: StreamsUnit.GetResponse = {
  unit: { sources: [], destinations: [], pipelines: [] },
  ui_metadata: {},
};

const s3FormData = (s3: DestinationCreationFormData['s3']): DestinationCreationFormData => ({
  storageKind: 'external_storage',
  destinationName: 'S3 archive',
  elasticsearch: { ...EMPTY_ELASTICSEARCH_DESTINATION_FORM },
  s3,
});

describe('destination form', () => {
  describe('S3', () => {
    it('requires region, bucket, access key and secret', () => {
      const formData = s3FormData({ ...EMPTY_S3_DESTINATION_FORM, region: '   ' });

      expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({
        region: 'required',
        bucket: 'required',
        accessKey: 'required',
        secret: 'required',
      });
      expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(false);
    });

    it('can submit when every S3 field is set', () => {
      const formData = s3FormData({
        region: 'eu-west-1',
        bucket: 'demo-bucket',
        accessKey: 'AKIAEXAMPLEKEYID',
        secret: 'example-secret-access-key',
      });

      expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({});
      expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
    });

    it('ignores S3 fields for a local Elasticsearch destination', () => {
      const formData: DestinationCreationFormData = {
        ...s3FormData({ ...EMPTY_S3_DESTINATION_FORM }),
        storageKind: 'local_elasticsearch',
        elasticsearch: { index: 'logs-demo', indexPatterns: '' },
      };

      expect(getDestinationCreationFormErrors({ formData, unitDefinition })).toEqual({});
      expect(canSubmitDestinationForm({ formData, unitDefinition })).toBe(true);
    });
  });
});
