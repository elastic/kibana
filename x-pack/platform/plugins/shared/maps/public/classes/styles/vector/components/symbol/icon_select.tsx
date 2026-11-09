/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyboardEvent } from 'react';
import React, { Component, Fragment } from 'react';
import type { EuiFormControlLayoutProps, EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiFieldText,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiFocusTrap,
  keys,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DEFAULT_CUSTOM_ICON_CUTOFF,
  DEFAULT_CUSTOM_ICON_RADIUS,
} from '../../../../../../common/constants';
import { SymbolIcon } from '../legend/symbol_icon';
import { SYMBOL_OPTIONS } from '../../symbol_utils';
import { getIsDarkMode } from '../../../../../kibana_services';
import { CustomIconModal } from './custom_icon_modal';
import { PrependButton } from './prepend_button';
import type { CustomIcon } from '../../../../../../common/descriptor_types';

function isKeyboardEvent(event: unknown): event is KeyboardEvent {
  return typeof event === 'object' && event !== null && 'keyCode' in event;
}

interface Props {
  append?: EuiFormControlLayoutProps['append'];
  customIcons: CustomIcon[];
  icon: { value: string; svg?: string; label?: string };
  onChange: (params: { selectedIconId: string }) => void;
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
}

interface State {
  isPopoverOpen: boolean;
  isModalVisible: boolean;
}

export class IconSelect extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    isModalVisible: false,
  };

  _handleSave = ({ symbolId, svg, cutoff, radius, label }: CustomIcon) => {
    const icons = [
      ...this.props.customIcons.filter((i) => {
        return i.symbolId !== symbolId;
      }),
      {
        symbolId,
        svg,
        label,
        cutoff,
        radius,
      },
    ];
    this.props.onCustomIconsChange(icons);
    this._hideModal();
  };

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _hideModal = () => {
    this.setState({ isModalVisible: false });
  };

  _openPopover = () => {
    this.setState({ isPopoverOpen: true });
  };

  _showModal = () => {
    this.setState({ isModalVisible: true });
  };

  _toggleModal = () => {
    this.setState((prevState) => ({
      isModalVisible: !prevState.isModalVisible,
    }));
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _handleKeyboardActivity = (e: unknown) => {
    if (isKeyboardEvent(e)) {
      if (e.key === keys.ENTER) {
        e.preventDefault();
        this._togglePopover();
      } else if (e.key === keys.ARROW_DOWN) {
        this._openPopover();
      }
    }
  };

  _onIconSelect = (options: EuiSelectableOption[]) => {
    const selectedOption = options.find((option) => {
      return option.checked === 'on';
    });

    if (selectedOption) {
      const { key } = selectedOption;
      this.props.onChange({ selectedIconId: key as string });
    }
    this._closePopover();
  };

  _renderPopoverButton() {
    const { value, svg, label } = this.props.icon;
    return (
      <EuiFieldText
        icon={{ type: 'chevronSingleDown', side: 'right' }}
        onClick={this._togglePopover}
        onKeyDown={this._handleKeyboardActivity}
        value={label || value}
        compressed
        readOnly
        fullWidth
        prepend={<PrependButton value={value} svg={svg as string} />}
        append={this.props.append}
      />
    );
  }

  _renderIconSelectable() {
    const makiOptions: EuiSelectableOption[] = [
      {
        label: i18n.translate('xpack.maps.styles.vector.iconSelect.kibanaIconsGroupLabel', {
          defaultMessage: 'Kibana icons',
        }),
        isGroupLabel: true,
      },
      ...SYMBOL_OPTIONS.map(({ value, label, svg }) => {
        return {
          key: value,
          label,
          prepend: (
            <SymbolIcon
              key={value}
              symbolId={value}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
              svg={svg}
            />
          ),
        };
      }),
    ];

    const customOptions: EuiSelectableOption[] = this.props.customIcons.map(
      ({ symbolId, label, svg }) => {
        return {
          key: symbolId,
          label,
          prepend: (
            <SymbolIcon
              key={symbolId}
              symbolId={symbolId}
              svg={svg}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            />
          ),
        };
      }
    );

    if (customOptions.length)
      customOptions.splice(0, 0, {
        label: i18n.translate('xpack.maps.styles.vector.iconSelect.customIconsGroupLabel', {
          defaultMessage: 'Custom icons',
        }),
        isGroupLabel: true,
      });

    const options = [...customOptions, ...makiOptions];

    return (
      <EuiSelectable searchable options={options} onChange={this._onIconSelect}>
        {(list, search) => (
          <div style={{ width: '300px' }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter>
              {' '}
              <EuiButton fullWidth size="s" onClick={this._toggleModal}>
                <FormattedMessage
                  id="xpack.maps.styles.vector.iconSelect.addCustomIconButtonLabel"
                  defaultMessage="Add custom icon"
                />
              </EuiButton>
            </EuiPopoverFooter>
          </div>
        )}
      </EuiSelectable>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiPopover
          ownFocus
          button={this._renderPopoverButton()}
          isOpen={this.state.isPopoverOpen}
          closePopover={this._closePopover}
          anchorPosition="downLeft"
          panelPaddingSize="s"
          display="block"
          aria-label={i18n.translate('xpack.maps.styles.vector.iconSelect.popoverAriaLabel', {
            defaultMessage: 'Icon selector',
          })}
        >
          <EuiFocusTrap clickOutsideDisables={true}>{this._renderIconSelectable()}</EuiFocusTrap>
        </EuiPopover>
        {this.state.isModalVisible ? (
          <CustomIconModal
            title="Add custom Icon"
            cutoff={DEFAULT_CUSTOM_ICON_CUTOFF}
            radius={DEFAULT_CUSTOM_ICON_RADIUS}
            onSave={this._handleSave}
            onCancel={this._hideModal}
          />
        ) : null}
      </Fragment>
    );
  }
}
