/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiIcon, EuiSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CollapseFunction } from '../../common/expressions';

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
}: {
  value: string;
  onChange: (value: CollapseFunction) => void;
}) {
  return (
    <>
      <EuiFormRow
        id="lns-indexPattern-collapse-by"
        label={
          <EuiToolTip
            delay="long"
            position="top"
            content={i18n.translate('xpack.lens.collapse.infoIcon', {
              defaultMessage:
                'Do not show this dimension in the visualization and aggregate all metric values which have the same value for this dimension into a single number.',
            })}
          >
            <span>
              {i18n.translate('xpack.lens.collapse.label', { defaultMessage: 'Collapse by' })}
              {''}
              <EuiIcon type="questionInCircle" color="subdued" size="s" className="eui-alignTop" />
            </span>
          </EuiToolTip>
        }
        display="rowCompressed"
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
    </>
  );
}
