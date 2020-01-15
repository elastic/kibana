/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox, EuiComboBoxOptionProps, EuiHealth, EuiHighlight } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { Space } from '../../../../../../../../../spaces/common/model/space';
import { getSpaceColor } from '../../../../../../../../../spaces/public/lib/space_attributes';

const spaceToOption = (space?: Space, currentSelection?: 'global' | 'spaces') => {
  if (!space) {
    return;
  }

  return {
    id: `spaceOption_${space.id}`,
    label: space.name,
    color: getSpaceColor(space),
    disabled:
      (currentSelection === 'global' && space.id !== '*') ||
      (currentSelection === 'spaces' && space.id === '*'),
  };
};

const spaceIdToOption = (spaces: Space[]) => (s: string) =>
  spaceToOption(spaces.find(space => space.id === s));

interface Props {
  spaces: Space[];
  selectedSpaceIds: string[];
  onChange: (spaceIds: string[]) => void;
  disabled?: boolean;
  intl: InjectedIntl;
}

export class SpaceSelector extends Component<Props, {}> {
  public render() {
    const renderOption = (option: any, searchValue: string, contentClassName: string) => {
      const { color, label } = option;
      return (
        <EuiHealth color={color}>
          <span className={contentClassName}>
            <EuiHighlight search={searchValue}>{label}</EuiHighlight>
          </span>
        </EuiHealth>
      );
    };

    return (
      <EuiComboBox
        data-test-subj={'spaceSelectorComboBox'}
        aria-label={this.props.intl.formatMessage({
          id: 'xpack.security.management.editRole.spaceSelectorLabel',
          defaultMessage: 'Spaces',
        })}
        fullWidth
        options={this.getOptions()}
        renderOption={renderOption}
        selectedOptions={this.getSelectedOptions()}
        isDisabled={this.props.disabled}
        onChange={this.onChange}
      />
    );
  }

  private onChange = (selectedSpaces: EuiComboBoxOptionProps[]) => {
    this.props.onChange(selectedSpaces.map(s => (s.id as string).split('spaceOption_')[1]));
  };

  private getOptions = () => {
    const options = this.props.spaces.map(space =>
      spaceToOption(
        space,
        this.props.selectedSpaceIds.includes('*')
          ? 'global'
          : this.props.selectedSpaceIds.length > 0
          ? 'spaces'
          : undefined
      )
    );

    return options.filter(Boolean) as EuiComboBoxOptionProps[];
  };

  private getSelectedOptions = () => {
    const options = this.props.selectedSpaceIds.map(spaceIdToOption(this.props.spaces));

    return options.filter(Boolean) as EuiComboBoxOptionProps[];
  };
}
