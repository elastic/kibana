/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { txtChooseDestinationIndexPattern } from './i18n';

export interface IndexPatternItem {
  id: string;
  title: string;
}

export interface DiscoverDrilldownConfigProps {
  activeIndexPatternId?: string;
  indexPatterns: IndexPatternItem[];
  onIndexPatternSelect: (indexPatternId: string) => void;
  customIndexPattern?: boolean;
  onCustomIndexPatternToggle?: () => void;
  carryFiltersAndQuery?: boolean;
  onCarryFiltersAndQueryToggle?: () => void;
  carryTimeRange?: boolean;
  onCarryTimeRangeToggle?: () => void;
}

export const DiscoverDrilldownConfig: React.FC<DiscoverDrilldownConfigProps> = ({
  activeIndexPatternId,
  indexPatterns,
  onIndexPatternSelect,
  customIndexPattern,
  onCustomIndexPatternToggle,
  onCarryFiltersAndQueryToggle,
  onCarryTimeRangeToggle,
}) => {
  return (
    <>
      <EuiCallOut title="Example warning!" color="warning" iconType="help">
        <p>
          This is an example drilldown. It is meant as a starting point for developers, so they can
          grab this code and get started. It does not provide a complete working functionality but
          serves as a getting started example.
        </p>
        <p>
          Implementation of the actual <em>Go to Discover</em> drilldown is tracked in{' '}
          <a href="https://github.com/elastic/kibana/issues/60227">#60227</a>
        </p>
      </EuiCallOut>
      <EuiSpacer size="xl" />
      {!!onCustomIndexPatternToggle && (
        <>
          <EuiFormRow hasChildLabel={false}>
            <EuiSwitch
              name="customIndexPattern"
              label="Use custom index pattern"
              checked={!!customIndexPattern}
              onChange={onCustomIndexPatternToggle}
            />
          </EuiFormRow>
          {!!customIndexPattern && (
            <EuiFormRow fullWidth label={txtChooseDestinationIndexPattern}>
              <EuiSelect
                name="selectDashboard"
                hasNoInitialSelection={true}
                fullWidth
                options={[
                  { id: '', text: 'Pick one...' },
                  ...indexPatterns.map(({ id, title }) => ({ value: id, text: title })),
                ]}
                value={activeIndexPatternId || ''}
                onChange={(e) => onIndexPatternSelect(e.target.value)}
              />
            </EuiFormRow>
          )}
          <EuiSpacer size="xl" />
        </>
      )}

      {!!onCarryFiltersAndQueryToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            disabled
            name="carryFiltersAndQuery"
            label="Carry over filters and query"
            checked={false}
            onChange={onCarryFiltersAndQueryToggle}
          />
        </EuiFormRow>
      )}
      {!!onCarryTimeRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            disabled
            name="carryTimeRange"
            label="Carry over time range"
            checked={false}
            onChange={onCarryTimeRangeToggle}
          />
        </EuiFormRow>
      )}
    </>
  );
};
