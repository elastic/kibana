/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  EuiTitle,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiHorizontalRule,
  EuiText,
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import styled from 'styled-components';
import { FilterBadgeList } from './FilterBadgeList';
import { unit, px } from '../../../../style/variables';
import { FilterTitleButton } from './FilterTitleButton';

const Popover = styled(EuiPopover).attrs({
  anchorClassName: 'anchor'
})`
  .anchor {
    display: block;
  }
`;

const SelectContainer = styled.div`
  width: ${px(unit * 16)};
`;

const Counter = styled.div`
  border-radius: ${theme.euiBorderRadius};
  background: ${theme.euiColorLightShade};
  padding: 0 ${theme.paddingSizes.xs};
`;

const ApplyButton = styled(EuiButton)`
  align-self: flex-end;
`;

interface Props {
  name: string;
  title: string;
  options: Array<{
    name: string;
    count: number;
  }>;
  onChange: (value: string[]) => void;
  value: string[];
  showCount: boolean;
}

type Option = EuiSelectable['props']['options'][0];

const Filter = ({
  name,
  title,
  options,
  onChange,
  value,
  showCount
}: Props) => {
  const [showPopover, setShowPopover] = useState(false);

  const toggleShowPopover = () => setShowPopover(show => !show);

  const button = (
    <FilterTitleButton onClick={toggleShowPopover}>{title}</FilterTitleButton>
  );

  const items: Option[] = useMemo(
    () =>
      options.map(option => ({
        label: option.name,
        append: showCount ? (
          <Counter>
            <EuiText size="xs">{option.count}</EuiText>
          </Counter>
        ) : null,
        checked: value.includes(option.name) ? 'on' : undefined
      })),
    [value, options, showCount]
  );

  const [visibleOptions, setVisibleOptions] = useState(items);

  useEffect(() => {
    setVisibleOptions(items);
  }, [items]);

  return (
    <>
      <Popover
        id={`local-filter-${name}`}
        closePopover={toggleShowPopover}
        button={button}
        isOpen={showPopover}
        panelPaddingSize="s"
        anchorPosition="downLeft"
      >
        <EuiSelectable
          onChange={selectedOptions => {
            setVisibleOptions(selectedOptions);
          }}
          options={visibleOptions}
          searchable={true}
        >
          {(list, search) => (
            <SelectContainer>
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={true}>
                  <EuiTitle size="xxxs" textTransform="uppercase">
                    <h4>
                      {i18n.translate('xpack.apm.applyFilter', {
                        defaultMessage: 'Apply {title} filter',
                        values: { title }
                      })}
                    </h4>
                  </EuiTitle>
                  <EuiHorizontalRule margin="none" />
                  <EuiSpacer size="s" />
                  {search}
                  <EuiSpacer size="s" />
                  {list}
                  <EuiSpacer size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ApplyButton
                    color="primary"
                    fill={true}
                    onClick={() => {
                      const newValue = visibleOptions
                        .filter(option => option.checked === 'on')
                        .map(option => option.label);

                      setShowPopover(false);
                      onChange(newValue);
                    }}
                    size="s"
                  >
                    {i18n.translate('xpack.apm.applyOptions', {
                      defaultMessage: 'Apply options'
                    })}
                  </ApplyButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </SelectContainer>
          )}
        </EuiSelectable>
      </Popover>
      {value.length ? (
        <>
          <FilterBadgeList
            onRemove={val => {
              onChange(value.filter(v => val !== v));
            }}
            value={value}
          />
          <EuiSpacer size="s"></EuiSpacer>
        </>
      ) : null}
    </>
  );
};

export { Filter };
