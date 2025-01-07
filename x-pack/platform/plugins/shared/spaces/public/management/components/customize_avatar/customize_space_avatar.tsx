/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiColorPicker,
  EuiFieldText,
  EuiFilePicker,
  EuiFormRow,
} from '@elastic/eui';
import type { ChangeEvent } from 'react';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';

import { MAX_SPACE_INITIALS } from '../../../../common';
import { encode, imageTypes } from '../../../../common/lib/dataurl';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';

interface Props {
  space: CustomizeSpaceFormValues;
  onChange: (space: CustomizeSpaceFormValues) => void;
  validator: SpaceValidator;
}

export class CustomizeSpaceAvatar extends Component<Props> {
  private storeImageChanges(imageUrl: string | undefined) {
    this.props.onChange({
      ...this.props.space,
      imageUrl,
    });
  }

  //
  // images below 64x64 pixels are left untouched
  // images above that threshold are resized
  //

  private handleImageUpload = (imgUrl: string) => {
    const thisInstance = this;
    const image = new Image();
    image.addEventListener(
      'load',
      function () {
        const MAX_IMAGE_SIZE = 64;
        const imgDimx = image.width;
        const imgDimy = image.height;
        if (imgDimx <= MAX_IMAGE_SIZE && imgDimy <= MAX_IMAGE_SIZE) {
          thisInstance.storeImageChanges(imgUrl);
        } else {
          const imageCanvas = document.createElement('canvas');
          const canvasContext = imageCanvas.getContext('2d');
          if (imgDimx >= imgDimy) {
            imageCanvas.width = MAX_IMAGE_SIZE;
            imageCanvas.height = Math.floor((imgDimy * MAX_IMAGE_SIZE) / imgDimx);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          } else {
            imageCanvas.height = MAX_IMAGE_SIZE;
            imageCanvas.width = Math.floor((imgDimx * MAX_IMAGE_SIZE) / imgDimy);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          }
        }
      },
      false
    );
    image.src = imgUrl;
  };

  private onFileUpload = (files: FileList | null) => {
    if (files == null || files.length === 0) {
      this.storeImageChanges(undefined);
      return;
    }
    const file = files[0];
    if (imageTypes.indexOf(file.type) > -1) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl));
    }
  };

  public render() {
    const { space } = this.props;

    return (
      <form onSubmit={() => false}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.spaces.management.customizeSpaceAvatar.avatarTypeFormRowLabel',
            {
              defaultMessage: 'Avatar type',
            }
          )}
          fullWidth
        >
          <EuiButtonGroup
            legend=""
            options={[
              {
                id: `initials`,
                label: i18n.translate(
                  'xpack.spaces.management.customizeSpaceAvatar.initialsLabel',
                  {
                    defaultMessage: 'Initials',
                  }
                ),
              },
              {
                id: `image`,
                label: i18n.translate('xpack.spaces.management.customizeSpaceAvatar.imageLabel', {
                  defaultMessage: 'Image',
                }),
              },
            ]}
            idSelected={space.avatarType ?? 'initials'}
            onChange={(avatarType: string) =>
              this.props.onChange({
                ...space,
                avatarType: avatarType as CustomizeSpaceFormValues['avatarType'],
              })
            }
            buttonSize="m"
          />
        </EuiFormRow>
        {space.avatarType !== 'image' ? (
          <EuiFormRow
            label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.initialsLabel', {
              defaultMessage: 'Initials',
            })}
            helpText={i18n.translate(
              'xpack.spaces.management.customizeSpaceAvatar.initialsHelpText',
              {
                defaultMessage: 'Enter up to two characters.',
              }
            )}
            {...this.props.validator.validateAvatarInitials(space)}
            fullWidth
          >
            <EuiFieldText
              data-test-subj="spaceLetterInitial"
              name="spaceInitials"
              value={space.initials ?? ''}
              onChange={this.onInitialsChange}
              isInvalid={this.props.validator.validateAvatarInitials(space).isInvalid}
              fullWidth
            />
          </EuiFormRow>
        ) : (
          <EuiFormRow
            label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.imageUrlLabel', {
              defaultMessage: 'Image',
            })}
            {...this.props.validator.validateAvatarImage(space)}
            fullWidth
          >
            <EuiFilePicker
              display="default"
              data-test-subj="uploadCustomImageFile"
              initialPromptText={i18n.translate(
                'xpack.spaces.management.customizeSpaceAvatar.imageUrlPromptText',
                {
                  defaultMessage: 'Select image file',
                }
              )}
              onChange={this.onFileUpload}
              accept={imageTypes.join(',')}
              isInvalid={this.props.validator.validateAvatarImage(space).isInvalid}
              fullWidth
            />
          </EuiFormRow>
        )}
        <EuiFormRow
          label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.colorLabel', {
            defaultMessage: 'Background color',
          })}
          {...this.props.validator.validateAvatarColor(space)}
          fullWidth
        >
          <EuiColorPicker
            color={space.color ?? ''}
            onChange={this.onColorChange}
            isInvalid={this.props.validator.validateAvatarColor(space).isInvalid}
            fullWidth
          />
        </EuiFormRow>
      </form>
    );
  }

  public onInitialsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.props.onChange({
      ...this.props.space,
      customAvatarInitials: true,
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      customAvatarColor: true,
      color,
    });
  };
}
