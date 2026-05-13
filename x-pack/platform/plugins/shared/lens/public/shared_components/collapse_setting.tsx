/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiIconTip, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { CollapseFunction } from '../../common/expressions';

const options = [
  { text: i18n.translate('xpack.lens.collapse.none', { defaultMessage: 'None' }), value: '' },
  { text: i18n.translate('xpack.lens.collapse.sum', { defaultMessage: 'Sum' }), value: 'sum' },
  { text: i18n.translate('xpack.lens.collapse.min', { defaultMessage: 'Min' }), value: 'min' },
  { text: i18n.translate('xpack.lens.collapse.max', { defaultMessage: 'Max' }), value: 'max' },
  { text: i18n.translate('xpack.lens.collapse.avg', { defaultMessage: 'Average' }), value: 'avg' },
];

export function CollapseSetting({
  value,
  onChange,
  display,
}: {
  value: string;
  onChange: (value: CollapseFunction) => void;
  display?: 'rowCompressed' | 'columnCompressed';
}) {
  return (
    <div
      css={({
        euiTheme: {
          size: { base },
        },
      }) => ({
        padding: `0 ${base} ${base} ${base}`,
      })}
    >
      <EuiFormRow
        id="lns-indexPattern-collapse-by"
        label={
          <>
            {i18n.translate('xpack.lens.collapse.label', { defaultMessage: 'Collapse by' })}{' '}
            <EuiIconTip
              color="subdued"
              content={i18n.translate('xpack.lens.collapse.infoIcon', {
                defaultMessage:
                  'Do not show this dimension in the visualization and aggregate all metric values which have the same value for this dimension into a single number.',
              })}
              iconProps={{
                className: 'eui-alignTop',
              }}
              position="top"
              size="s"
              type="question"
            />
          </>
        }
        display={display ?? 'rowCompressed'}
        fullWidth
      >
        <EuiSelect
          fullWidth
          compressed
          data-test-subj="indexPattern-collapse-by"
          options={options}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange(e.target.value as CollapseFunction);
          }}
        />
      </EuiFormRow>
    </div>
  );
}
