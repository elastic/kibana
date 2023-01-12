/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDatePickerContext } from '../hooks/use_date_picker_context';
import { setFullTimeRange } from '../services/full_time_range_selector_service';
import type { GetTimeFieldRangeResponse } from '../services/types';
import { FROZEN_TIER_PREFERENCE, type FrozenTierPreference } from '../storage';

/**
 * FullTimeRangeSelectorProps React Component props interface
 */
export interface FullTimeRangeSelectorProps {
  /**
   * Frozen data preference ('exclude-frozen' | 'include-frozen')
   */
  frozenDataPreference: FrozenTierPreference;
  /**
   * Callback to set frozen data preference.
   * @param value - The updated frozen data preference.
   */
  setFrozenDataPreference: (value: FrozenTierPreference | undefined) => void;
  /**
   * timefilter service.
   */
  timefilter: TimefilterContract;
  /**
   * Current data view.
   */
  dataView: DataView;
  /**
   * Boolean flag to enable/disable the full time range button.
   */
  disabled: boolean;
  /**
   * Optional DSL query.
   */
  query?: QueryDslQueryContainer;
  /**
   * Optional callback.
   * @param value - The time field range response.
   */
  callback?: (value: GetTimeFieldRangeResponse) => void;
}

/**
 * Component for rendering a button which automatically sets the range of the time filter
 * to the time range of data in the index(es) mapped to the supplied Kibana data view or query.
 *
 * @type {FC<FullTimeRangeSelectorProps>}
 * @param props - `FullTimeRangeSelectorProps` component props
 * @returns {React.ReactElement} The FullTimeRangeSelector component.
 */
export const FullTimeRangeSelector: FC<FullTimeRangeSelectorProps> = (props) => {
  const {
    frozenDataPreference,
    setFrozenDataPreference,
    timefilter,
    dataView,
    query,
    disabled,
    callback,
  } = props;
  const {
    http,
    notifications: { toasts },
  } = useDatePickerContext();

  // wrapper around setFullTimeRange to allow for the calling of the optional callBack prop
  const setRange = useCallback(
    async (i: DataView, q?: QueryDslQueryContainer, excludeFrozenData?: boolean) => {
      try {
        const fullTimeRange = await setFullTimeRange(
          timefilter,
          i,
          toasts,
          http,
          q,
          excludeFrozenData
        );
        if (typeof callback === 'function') {
          callback(fullTimeRange);
        }
      } catch (e) {
        toasts.addDanger(
          i18n.translate(
            'xpack.ml.datePicker.fullTimeRangeSelector.errorSettingTimeRangeNotification',
            {
              defaultMessage: 'An error occurred setting the time range.',
            }
          )
        );
      }
    },
    [callback, http, timefilter, toasts]
  );

  const [isPopoverOpen, setPopover] = useState(false);

  const setPreference = useCallback(
    (id: string) => {
      setFrozenDataPreference(id as FrozenTierPreference);
      setRange(dataView, query, id === FROZEN_TIER_PREFERENCE.EXCLUDE);
      closePopover();
    },
    [dataView, query, setFrozenDataPreference, setRange]
  );

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const sortOptions: EuiRadioGroupOption[] = useMemo(() => {
    return [
      {
        id: FROZEN_TIER_PREFERENCE.EXCLUDE,
        label: i18n.translate(
          'xpack.ml.datePicker.fullTimeRangeSelector.useFullDataExcludingFrozenMenuLabel',
          {
            defaultMessage: 'Exclude frozen data tier',
          }
        ),
      },
      {
        id: FROZEN_TIER_PREFERENCE.INCLUDE,
        label: i18n.translate(
          'xpack.ml.datePicker.fullTimeRangeSelector.useFullDataIncludingFrozenMenuLabel',
          {
            defaultMessage: 'Include frozen data tier',
          }
        ),
      },
    ];
  }, []);

  const popoverContent = useMemo(
    () => (
      <EuiPanel>
        <EuiRadioGroup
          options={sortOptions}
          idSelected={frozenDataPreference}
          onChange={setPreference}
          compressed
        />
      </EuiPanel>
    ),
    [sortOptions, frozenDataPreference, setPreference]
  );

  const buttonTooltip = useMemo(
    () =>
      frozenDataPreference === FROZEN_TIER_PREFERENCE.EXCLUDE ? (
        <FormattedMessage
          id="xpack.ml.datePicker.fullTimeRangeSelector.useFullDataExcludingFrozenButtonTooltip"
          defaultMessage="Use full range of data excluding frozen data tier."
        />
      ) : (
        <FormattedMessage
          id="xpack.ml.datePicker.fullTimeRangeSelector.useFullDataIncludingFrozenButtonTooltip"
          defaultMessage="Use full range of data including frozen data tier, which might have slower search results."
        />
      ),
    [frozenDataPreference]
  );

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiToolTip content={buttonTooltip}>
        <EuiButton
          isDisabled={disabled}
          onClick={() => setRange(dataView, query, true)}
          data-test-subj="mlDatePickerButtonUseFullData"
        >
          <FormattedMessage
            id="xpack.ml.datePicker.fullTimeRangeSelector.useFullDataButtonLabel"
            defaultMessage="Use full data"
          />
        </EuiButton>
      </EuiToolTip>
      <EuiFlexItem grow={false}>
        <EuiPopover
          id={'mlFullTimeRangeSelectorOption'}
          button={
            <EuiButtonIcon
              display="base"
              size="m"
              iconType="boxesVertical"
              aria-label={i18n.translate(
                'xpack.ml.datePicker.fullTimeRangeSelector.moreOptionsButtonAriaLabel',
                {
                  defaultMessage: 'More options',
                }
              )}
              onClick={onButtonClick}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          {popoverContent}
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
