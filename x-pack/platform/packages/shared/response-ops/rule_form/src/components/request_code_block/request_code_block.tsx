/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import React, { useMemo } from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import type { CreateRuleBody, UpdateRuleBody } from '../../common/apis';
import {
  UPDATE_FIELDS_WITH_ACTIONS,
  transformCreateRuleBody,
  transformUpdateRuleBody,
} from '../../common/apis';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { useRuleFormState } from '../../hooks';
import { SHOW_REQUEST_MODAL_ERROR } from '../../translations';
import type { RuleFormData, ShowRequestActivePage } from '../../types';

const stringifyBodyRequest = ({
  formData,
  activeTab,
}: {
  formData: RuleFormData;
  activeTab: ShowRequestActivePage;
}): string => {
  try {
    const request =
      activeTab === 'update'
        ? transformUpdateRuleBody(pick(formData, UPDATE_FIELDS_WITH_ACTIONS) as UpdateRuleBody)
        : transformCreateRuleBody(omit(formData, 'id') as CreateRuleBody);
    return JSON.stringify(request, null, 2);
  } catch {
    return SHOW_REQUEST_MODAL_ERROR;
  }
};

interface RequestCodeBlockProps {
  activeTab: ShowRequestActivePage;
  'data-test-subj'?: string;
}
export const RequestCodeBlock = (props: RequestCodeBlockProps) => {
  const { 'data-test-subj': dataTestSubj, activeTab } = props;
  const { formData, id, multiConsumerSelection } = useRuleFormState();

  const formattedRequest = useMemo(() => {
    return stringifyBodyRequest({
      formData: {
        ...formData,
        ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
      },
      activeTab,
    });
  }, [formData, multiConsumerSelection, activeTab]);

  return (
    <EuiCodeBlock language="json" isCopyable data-test-subj={dataTestSubj}>
      {`${activeTab === 'update' ? 'PUT' : 'POST'} kbn:${BASE_ALERTING_API_PATH}/rule${
        activeTab === 'update' ? `/${id}` : ''
      }\n${formattedRequest}`}
    </EuiCodeBlock>
  );
};
