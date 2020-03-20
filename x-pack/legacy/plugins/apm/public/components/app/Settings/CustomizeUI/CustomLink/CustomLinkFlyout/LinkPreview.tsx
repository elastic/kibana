/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { Transaction } from '../../../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import { callApmApi } from '../../../../../../services/rest/createCallApmApi';
import {
  FilterKeyValue,
  convertFiltersToObject,
  replaceTemplateVariables
} from './helper';

interface Props {
  label: string;
  url: string;
  filters: FilterKeyValue[];
}

const fetchTransaction = debounce(
  async (
    filters: FilterKeyValue[],
    callback: (transaction: Transaction) => void
  ) => {
    const transaction = await callApmApi({
      pathname: '/api/apm/settings/custom_links/transaction',
      params: { query: convertFiltersToObject(filters) }
    });
    callback(transaction);
  },
  1000
);

const getTextColor = (value?: string) => (value ? 'default' : 'subdued');

export const LinkPreview = ({ label, url, filters }: Props) => {
  const [transaction, setTransaction] = useState<Transaction | undefined>();

  useEffect(() => {
    fetchTransaction(filters, setTransaction);
  }, [filters]);

  const { formattedUrl, error } = replaceTemplateVariables(url, transaction);

  return (
    <EuiPanel betaBadgeLabel="Preview" paddingSize="l">
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {error && (
            <EuiToolTip position="top" content={error}>
              <EuiIcon type="alert" />
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="s" color={getTextColor(label)}>
        {label
          ? label
          : i18n.translate(
              'xpack.apm.settings.customizeUI.customLink.default.label',
              { defaultMessage: 'Elastic.co' }
            )}
      </EuiText>
      <EuiText size="s" color={getTextColor(url)}>
        {url ? (
          <EuiLink href={formattedUrl} target="_blank">
            {formattedUrl}
          </EuiLink>
        ) : (
          i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.default.url',
            { defaultMessage: 'https://www.elastic.co' }
          )
        )}
      </EuiText>
      <EuiSpacer />
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.linkPreview.descrition',
          {
            defaultMessage:
              'Test your link with values from an example transaction document based on the filters above.'
          }
        )}
      </EuiText>
    </EuiPanel>
  );
};
