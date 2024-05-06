/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { ReactNode, useState } from 'react';
import { FieldPath } from 'react-hook-form';
import { QuerySearchBar } from './query_search_bar';
import { QueryDocumentsFlyout } from './query_documents_flyout';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { CreateSLOForm } from '../../types';

export interface SearchBarProps {
  dataTestSubj: string;
  indexPatternString: string | undefined;
  label: string;
  name: FieldPath<CreateSLOForm>;
  placeholder: string;
  required?: boolean;
  tooltip?: ReactNode;
}

export function QueryBuilder(props: SearchBarProps) {
  const { indexPatternString, name } = props;
  const { dataView } = useCreateDataView({
    indexPatternString,
  });

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const [range, setRange] = useState({ from: 'now-15m', to: 'now' });

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <QuerySearchBar
            {...props}
            setRange={setRange}
            range={range}
            isFlyoutOpen={isFlyoutOpen}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            css={{ marginTop: 27 }}
            isDisabled={!Boolean(dataView)}
            data-test-subj="o11yQueryBuilderButton"
            iconType="documents"
            onClick={() => setIsFlyoutOpen(true)}
            aria-label={i18n.translate('xpack.slo.queryBuilder.documentsButtonLabel', {
              defaultMessage: 'View documents',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isFlyoutOpen && dataView && (
        <QueryDocumentsFlyout
          range={range}
          setRange={setRange}
          setIsFlyoutOpen={setIsFlyoutOpen}
          dataView={dataView}
          name={name}
          searchBarProps={props}
        />
      )}
    </>
  );
}
