/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiButtonIcon,
  EuiColorPicker,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiFilePicker,
  isValidHex,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';

import { get } from 'lodash';
import { encode } from '../../../../../common/lib/dataurl';

import { MAX_SPACE_INITIALS } from '../../../../../common/constants';
import { Space } from '../../../../../common/model/space';
import { getSpaceColor, getSpaceInitials } from '../../../../../common/space_attributes';

const VALID_IMAGE_TYPES = ['gif', 'jpeg', 'png', 'svg+xml'];

interface Props {
  space: Partial<Space>;
  onChange: (space: Partial<Space>) => void;
  intl: InjectedIntl;
}

interface State {
  initialsHasFocus: boolean;
  pendingInitials?: string | null;
  imageUrl?: string | null;
  imageFilename?: string | null;
}

class CustomizeSpaceAvatarUI extends Component<Props, State> {
  private initialsRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      initialsHasFocus: false,
      imageUrl: props.space.imageUrl,
      imageFilename: props.space.imageFilename,
    };
  }

  private storeImageChanges(imgUrl: string, fname: string) {
    this.setState({ imageUrl: imgUrl });
    this.props.onChange({
      ...this.props.space,
      imageUrl: imgUrl,
      imageFilename: fname,
    });
  }

  //
  // images below 64x64 pixels are left untouched
  // images above that threshold are resized
  //

  private handleImageUpload = (imgUrl: string, fname: string) => {
    const thisInstance = this;
    const image = new Image();
    image.addEventListener(
      'load',
      function() {
        const MAX_IMAGE_SIZE = 64;
        const imgDimx = image.width;
        const imgDimy = image.height;
        if (imgDimx <= MAX_IMAGE_SIZE && imgDimy <= MAX_IMAGE_SIZE) {
          thisInstance.storeImageChanges(imgUrl, fname);
        } else {
          const oc = document.createElement('canvas');
          const octx = oc.getContext('2d');
          if (imgDimx >= imgDimy) {
            oc.width = MAX_IMAGE_SIZE;
            oc.height = Math.floor((imgDimy * MAX_IMAGE_SIZE) / imgDimx);
            octx.drawImage(image, 0, 0, oc.width, oc.height);
            const resizedImageUrl = oc.toDataURL();
            thisInstance.storeImageChanges(resizedImageUrl, fname);
          } else {
            oc.height = MAX_IMAGE_SIZE;
            oc.width = Math.floor((imgDimx * MAX_IMAGE_SIZE) / imgDimy);
            octx.drawImage(image, 0, 0, oc.width, oc.height);
            const resizedImageUrl = oc.toDataURL();
            thisInstance.storeImageChanges(resizedImageUrl, fname);
          }
        }
      },
      false
    );
    image.src = imgUrl;
  };

  private onFileUpload = (files: File[]) => {
    const [file] = files;
    const [type, subtype] = get(file, 'type', '').split('/');
    if (type === 'image' && VALID_IMAGE_TYPES.indexOf(subtype) >= 0) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl, file.name));
    }
  };

  public render() {
    const { space, intl } = this.props;

    const { initialsHasFocus, pendingInitials } = this.state;

    const spaceColor = getSpaceColor(space);
    const isInvalidSpaceColor = !isValidHex(spaceColor) && spaceColor !== '';

    return (
      <form onSubmit={() => false}>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            label={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
              defaultMessage: 'Initials (2 max)',
            })}
          >
            <EuiFieldText
              inputRef={this.initialsInputRef}
              name="spaceInitials"
              // allows input to be cleared or otherwise invalidated while user is editing the initials,
              // without defaulting to the derived initials provided by `getSpaceInitials`
              value={initialsHasFocus ? pendingInitials || '' : getSpaceInitials(space)}
              onChange={this.onInitialsChange}
              disabled={this.state.imageUrl && this.state.imageUrl !== '' ? true : false}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.colorFormRowLabel',
              defaultMessage: 'Color',
            })}
            isInvalid={isInvalidSpaceColor}
          >
            <EuiColorPicker
              color={spaceColor}
              onChange={this.onColorChange}
              isInvalid={isInvalidSpaceColor}
            />
          </EuiFormRow>
          {this.filePickerOrImage()}
        </EuiFlexItem>
      </form>
    );
  }

  private removeImageUrl() {
    this.setState({ imageUrl: '' });
    this.props.onChange({
      ...this.props.space,
      imageUrl: '',
      imageFilename: '',
    });
  }

  public filePickerOrImage() {
    const { intl } = this.props;

    if (!this.state.imageUrl) {
      return (
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.imageUrl',
            defaultMessage: 'Custom image',
          })}
        >
          <EuiFilePicker
            display="default"
            initialPromptText={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.selectImageUrl',
              defaultMessage: 'Select image file',
            })}
            onChange={this.onFileUpload}
            accept="image/*"
          />
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.imageUrl',
            defaultMessage: 'Custom image',
          })}
        >
          <div>
            <div style={{ float: 'left', overflowWrap: 'break-word', width: '80%' }}>
              {this.props.space.imageFilename}
            </div>
            <div style={{ float: 'right' }}>
              <EuiButtonIcon
                iconType="trash"
                aria-label="Remove image"
                color="danger"
                onClick={() => this.removeImageUrl()}
                title="Remove image"
              />
            </div>
          </div>
        </EuiFormRow>
      );
    }
  }

  public initialsInputRef = (ref: HTMLInputElement) => {
    if (ref) {
      this.initialsRef = ref;
      this.initialsRef.addEventListener('focus', this.onInitialsFocus);
      this.initialsRef.addEventListener('blur', this.onInitialsBlur);
    } else {
      if (this.initialsRef) {
        this.initialsRef.removeEventListener('focus', this.onInitialsFocus);
        this.initialsRef.removeEventListener('blur', this.onInitialsBlur);
        this.initialsRef = null;
      }
    }
  };

  public onInitialsFocus = () => {
    this.setState({
      initialsHasFocus: true,
      pendingInitials: getSpaceInitials(this.props.space),
    });
  };

  public onInitialsBlur = () => {
    this.setState({
      initialsHasFocus: false,
      pendingInitials: null,
    });
  };

  public onInitialsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.setState({
      pendingInitials: initials,
    });

    this.props.onChange({
      ...this.props.space,
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      color,
    });
  };
}

export const CustomizeSpaceAvatar = injectI18n(CustomizeSpaceAvatarUI);
