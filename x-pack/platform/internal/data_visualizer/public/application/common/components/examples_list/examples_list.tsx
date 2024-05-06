/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiListGroup, EuiListGroupItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { GeoPointExample } from '../../../../../common/types/field_request_config';
import { ExpandedRowFieldHeader } from '../stats_table/components/expanded_row_field_header';
import { ExpandedRowPanel } from '../stats_table/components/field_data_expanded_row/expanded_row_panel';

interface Props {
  examples: Array<string | GeoPointExample | object>;
}

export const EMPTY_EXAMPLE = i18n.translate(
  'xpack.dataVisualizer.dataGrid.field.examplesList.emptyExampleMessage',
  { defaultMessage: '(empty)' }
);
export const ExamplesList: FC<Props> = ({ examples }) => {
  if (examples === undefined || examples === null || !Array.isArray(examples)) {
    return null;
  }
  let examplesContent;
  if (examples.length === 0) {
    examplesContent = (
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.examplesList.noExamplesMessage"
        defaultMessage="No examples were obtained for this field"
      />
    );
  } else {
    examplesContent = examples.map((example, i) => {
      return (
        <EuiListGroupItem
          size="xs"
          key={`example_${i}`}
          label={
            typeof example === 'string'
              ? example === ''
                ? EMPTY_EXAMPLE
                : example
              : JSON.stringify(example)
          }
        />
      );
    });
  }

  return (
    <ExpandedRowPanel
      dataTestSubj="dataVisualizerFieldDataExamplesList"
      className="dvText__wrapper dvPanel__wrapper"
    >
      <ExpandedRowFieldHeader>
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.examplesList.title"
          defaultMessage="{numExamples, plural, one {Value} other {Examples}}"
          values={{
            numExamples: examples.length,
          }}
        />
      </ExpandedRowFieldHeader>
      <EuiListGroup showToolTips={true} maxWidth={'s'} gutterSize={'none'} flush={true}>
        {examplesContent}
      </EuiListGroup>
    </ExpandedRowPanel>
  );
};
