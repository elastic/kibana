/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverProps,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { isReservedSpace } from '../../../../../common';
import { Space } from '../../../../../common/model/space';
import { SpaceAvatar } from '../../../../components';
import { SpaceValidator, toSpaceIdentifier } from '../../lib';
import { SectionPanel } from '../section_panel';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { SpaceIdentifier } from './space_identifier';

interface Props {
  validator: SpaceValidator;
  space: Partial<Space>;
  editingExistingSpace: boolean;
  intl: InjectedIntl;
  onChange: (space: Partial<Space>) => void;
}

interface State {
  customizingAvatar: boolean;
  usingCustomIdentifier: boolean;
}

export class CustomizeSpace extends Component<Props, State> {
  public state = {
    customizingAvatar: false,
    usingCustomIdentifier: false,
  };

  public render() {
    const { validator, editingExistingSpace, intl } = this.props;
    const { name = '', description = '' } = this.props.space;
    const panelTitle = intl.formatMessage({
      id: 'xpack.spaces.management.manageSpacePage.customizeSpaceTitle',
      defaultMessage: 'Customize your space',
    });

    const extraPopoverProps: Partial<EuiPopoverProps> = {
      initialFocus: 'input[name="spaceInitials"]',
    };

    return (
      <SectionPanel
        collapsible={false}
        title={panelTitle}
        description={panelTitle}
        intl={this.props.intl}
      >
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.customizeSpacePanelDescription"
                  defaultMessage="Name your space and customize its avatar."
                />
              </h3>
            </EuiTitle>
          }
          description={this.getPanelDescription()}
          fullWidth
        >
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.manageSpacePage.nameFormRowLabel',
                  defaultMessage: 'Name',
                })}
                {...validator.validateSpaceName(this.props.space)}
                fullWidth
              >
                <EuiFieldText
                  name="name"
                  placeholder={intl.formatMessage({
                    id: 'xpack.spaces.management.manageSpacePage.awesomeSpacePlaceholder',
                    defaultMessage: 'Awesome space',
                  })}
                  value={name}
                  onChange={this.onNameChange}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={intl.formatMessage({
                  id: 'xpack.spaces.management.manageSpacePage.avatarFormRowLabel',
                  defaultMessage: 'Avatar',
                })}
              >
                <EuiPopover
                  id="customizeAvatarPopover"
                  button={
                    <button
                      title={intl.formatMessage({
                        id: 'xpack.spaces.management.manageSpacePage.clickToCustomizeTooltip',
                        defaultMessage: 'Click to customize this space avatar',
                      })}
                      onClick={this.togglePopover}
                    >
                      <SpaceAvatar space={this.props.space} size="l" />
                    </button>
                  }
                  closePopover={this.closePopover}
                  {...extraPopoverProps}
                  ownFocus={true}
                  isOpen={this.state.customizingAvatar}
                >
                  <div style={{ maxWidth: 240 }}>
                    <CustomizeSpaceAvatar space={this.props.space} onChange={this.onAvatarChange} />
                  </div>
                </EuiPopover>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {this.props.space && isReservedSpace(this.props.space) ? null : (
            <Fragment>
              <SpaceIdentifier
                space={this.props.space}
                editable={!editingExistingSpace}
                onChange={this.onSpaceIdentifierChange}
                validator={validator}
              />
            </Fragment>
          )}

          <EuiFormRow
            label={intl.formatMessage({
              id: 'xpack.spaces.management.manageSpacePage.spaceDescriptionFormRowLabel',
              defaultMessage: 'Description (optional)',
            })}
            helpText={intl.formatMessage({
              id: 'xpack.spaces.management.manageSpacePage.spaceDescriptionHelpText',
              defaultMessage: 'The description appears on the Space selection screen.',
            })}
            {...validator.validateSpaceDescription(this.props.space)}
            fullWidth
          >
            <EuiTextArea
              name="description"
              value={description}
              onChange={this.onDescriptionChange}
              fullWidth
              rows={2}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </SectionPanel>
    );
  }

  public togglePopover = () => {
    this.setState({
      customizingAvatar: !this.state.customizingAvatar,
    });
  };

  public closePopover = () => {
    this.setState({
      customizingAvatar: false,
    });
  };

  public getPanelDescription = () => {
    return this.props.editingExistingSpace ? (
      <p>
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.customizeSpacePanelUrlIdentifierNotEditable"
          defaultMessage="The url identifier cannot be changed."
        />
      </p>
    ) : (
      <p>
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.customizeSpacePanelUrlIdentifierEditable"
          defaultMessage="Note the URL identifier. You cannot change it after you create the space."
        />
      </p>
    );
  };

  public onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.props.space) {
      return;
    }

    const canUpdateId = !this.props.editingExistingSpace && !this.state.usingCustomIdentifier;

    let { id } = this.props.space;

    if (canUpdateId) {
      id = toSpaceIdentifier(e.target.value);
    }

    this.props.onChange({
      ...this.props.space,
      name: e.target.value,
      id,
    });
  };

  public onDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.space,
      description: e.target.value,
    });
  };

  public onSpaceIdentifierChange = (updatedIdentifier: string) => {
    const usingCustomIdentifier = updatedIdentifier !== toSpaceIdentifier(this.props.space.name);

    this.setState({
      usingCustomIdentifier,
    });
    this.props.onChange({
      ...this.props.space,
      id: toSpaceIdentifier(updatedIdentifier),
    });
  };

  public onAvatarChange = (space: Partial<Space>) => {
    this.props.onChange(space);
  };
}
