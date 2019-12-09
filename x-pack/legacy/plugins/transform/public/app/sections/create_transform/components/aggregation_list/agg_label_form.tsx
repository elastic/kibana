/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';

import { AggName, PivotAggsConfig, PivotAggsConfigWithUiSupportDict } from '../../../../common';

import { PopoverForm } from './popover_form';

interface Props {
  item: PivotAggsConfig;
  otherAggNames: AggName[];
  options: PivotAggsConfigWithUiSupportDict;
  deleteHandler(l: AggName): void;
  onChange(item: PivotAggsConfig): void;
}

export const AggLabelForm: React.FC<Props> = ({
  deleteHandler,
  item,
  otherAggNames,
  onChange,
  options,
}) => {
  const [isPopoverVisible, setPopoverVisibility] = useState(false);

  function update(updateItem: PivotAggsConfig) {
    onChange({ ...updateItem });
    setPopoverVisibility(false);
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="transform__AggregationLabel--text">
        <span className="eui-textTruncate" data-test-subj="transformAggregationEntryLabel">
          {item.aggName}
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="transform__GroupByLabel--button">
        <EuiPopover
          id="transformFormPopover"
          ownFocus
          button={
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.transform.aggLabelForm.editAggAriaLabel', {
                defaultMessage: 'Edit aggregation',
              })}
              size="s"
              iconType="pencil"
              onClick={() => setPopoverVisibility(!isPopoverVisible)}
              data-test-subj="transformAggregationEntryEditButton"
            />
          }
          isOpen={isPopoverVisible}
          closePopover={() => setPopoverVisibility(false)}
        >
          <PopoverForm
            defaultData={item}
            onChange={update}
            otherAggNames={otherAggNames}
            options={options}
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false} className="transform__GroupByLabel--button">
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.transform.aggLabelForm.deleteItemAriaLabel', {
            defaultMessage: 'Delete item',
          })}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(item.aggName)}
          data-test-subj="transformAggregationEntryDeleteButton"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
