/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import type { FormValues } from '../types';
import { serializeFormToYaml } from '../utils/yaml_form_utils';
import {
  mapFormValuesToCreateRequest,
  mapFormValuesToUpdateRequest,
} from '../utils/rule_request_mappers';

export type ShowRequestActivePage = 'create' | 'update';

export type ShowRequestViewMode = 'request' | 'yaml';

const SHOW_REQUEST_ERROR = i18n.translate(
  'xpack.alertingV2.ruleForm.showRequest.errorSerializing',
  { defaultMessage: 'Error serializing rule request' }
);

const SHOW_YAML_ERROR = i18n.translate(
  'xpack.alertingV2.ruleForm.showRequest.errorSerializingYaml',
  {
    defaultMessage: 'Error serializing rule YAML',
  }
);

const stringifyYaml = (formValues: FormValues): string => {
  try {
    return serializeFormToYaml(formValues);
  } catch {
    return SHOW_YAML_ERROR;
  }
};

const stringifyRequest = (formValues: FormValues, activeTab: ShowRequestActivePage): string => {
  try {
    const body =
      activeTab === 'update'
        ? mapFormValuesToUpdateRequest(formValues)
        : mapFormValuesToCreateRequest(formValues);
    return JSON.stringify(body, null, 2);
  } catch {
    return SHOW_REQUEST_ERROR;
  }
};

interface RequestCodeBlockProps {
  activeTab: ShowRequestActivePage;
  viewMode: ShowRequestViewMode;
  ruleId?: string;
  'data-test-subj'?: string;
}

export const RequestCodeBlock = ({
  activeTab,
  viewMode,
  ruleId,
  'data-test-subj': dataTestSubj,
}: RequestCodeBlockProps) => {
  const { getValues } = useFormContext<FormValues>();
  const formValues = getValues();

  if (viewMode === 'yaml') {
    const yaml = stringifyYaml(formValues);
    return (
      <EuiCodeBlock language="yaml" isCopyable data-test-subj={dataTestSubj}>
        {yaml}
      </EuiCodeBlock>
    );
  }

  const formattedRequest = stringifyRequest(formValues, activeTab);

  const method = activeTab === 'update' ? 'PATCH' : 'POST';
  const path =
    activeTab === 'update' ? `${ALERTING_V2_RULE_API_PATH}/${ruleId}` : ALERTING_V2_RULE_API_PATH;

  return (
    <EuiCodeBlock language="json" isCopyable data-test-subj={dataTestSubj}>
      {`${method} kbn:${path}\n${formattedRequest}`}
    </EuiCodeBlock>
  );
};
