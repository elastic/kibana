/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidHex } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { isValidSpaceIdentifier } from './space_identifier_utils';
import { isReservedSpace } from '../../../common/is_reserved_space';
import type { CustomizeSpaceFormValues } from '../types';

interface SpaceValidatorOptions {
  shouldValidate?: boolean;
}

export class SpaceValidator {
  private shouldValidate: boolean;

  constructor(options: SpaceValidatorOptions = {}) {
    this.shouldValidate = options.shouldValidate || false;
  }

  public enableValidation() {
    this.shouldValidate = true;
  }

  public disableValidation() {
    this.shouldValidate = false;
  }

  public validateSpaceName(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!space.name || !space.name.trim()) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredNameErrorMessage', {
          defaultMessage: 'Enter a name.',
        })
      );
    }

    if (space.name.length > 1024) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.nameMaxLengthErrorMessage', {
          defaultMessage: 'Name must not exceed 1024 characters.',
        })
      );
    }

    return valid();
  }

  public validateSpaceDescription(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.description && space.description.length > 2000) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.describeMaxLengthErrorMessage', {
          defaultMessage: 'Description must not exceed 2000 characters.',
        })
      );
    }

    return valid();
  }

  public validateURLIdentifier(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (isReservedSpace(space)) {
      return valid();
    }

    if (!space.id) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.urlIdentifierRequiredErrorMessage', {
          defaultMessage: 'Enter a URL identifier.',
        })
      );
    }

    if (!isValidSpaceIdentifier(space.id)) {
      return invalid(
        i18n.translate(
          'xpack.spaces.management.validateSpace.urlIdentifierAllowedCharactersErrorMessage',
          {
            defaultMessage:
              'URL identifier can only contain a-z, 0-9, and the characters "_" and "-".',
          }
        )
      );
    }

    return valid();
  }

  public validateAvatarInitials(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.avatarType !== 'image') {
      if (!space.initials) {
        return invalid(
          i18n.translate('xpack.spaces.management.validateSpace.requiredInitialsErrorMessage', {
            defaultMessage: 'Enter initials.',
          })
        );
      }
      if (space.initials.length > 2) {
        return invalid(
          i18n.translate('xpack.spaces.management.validateSpace.maxLengthInitialsErrorMessage', {
            defaultMessage: 'Enter no more than 2 characters.',
          })
        );
      }
    }

    return valid();
  }

  public validateAvatarColor(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (!space.color) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredColorErrorMessage', {
          defaultMessage: 'Select a background color.',
        })
      );
    }

    if (!isValidHex(space.color)) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.invalidColorErrorMessage', {
          defaultMessage: 'Enter a valid HEX color code.',
        })
      );
    }

    return valid();
  }

  public validateAvatarImage(space: CustomizeSpaceFormValues) {
    if (!this.shouldValidate) {
      return valid();
    }

    if (space.avatarType === 'image' && !space.imageUrl) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredImageErrorMessage', {
          defaultMessage: 'Upload an image.',
        })
      );
    }

    return valid();
  }

  public validateSolutionView(
    space: CustomizeSpaceFormValues,
    isEditing: boolean,
    allowSolutionVisibility = true
  ) {
    if (!this.shouldValidate || isEditing || !allowSolutionVisibility) {
      return valid();
    }

    if (!space.solution) {
      return invalid(
        i18n.translate('xpack.spaces.management.validateSpace.requiredSolutionViewErrorMessage', {
          defaultMessage: 'Select a solution.',
        })
      );
    }

    return valid();
  }

  public validateEnabledFeatures(space: CustomizeSpaceFormValues) {
    return valid();
  }

  public validateForSave(
    space: CustomizeSpaceFormValues,
    isEditing: boolean,
    allowSolutionVisibility: boolean
  ) {
    const { isInvalid: isNameInvalid } = this.validateSpaceName(space);
    const { isInvalid: isDescriptionInvalid } = this.validateSpaceDescription(space);
    const { isInvalid: isIdentifierInvalid } = this.validateURLIdentifier(space);
    const { isInvalid: isAvatarInitialsInvalid } = this.validateAvatarInitials(space);
    const { isInvalid: isAvatarColorInvalid } = this.validateAvatarColor(space);
    const { isInvalid: isAvatarImageInvalid } = this.validateAvatarImage(space);
    const { isInvalid: areFeaturesInvalid } = this.validateEnabledFeatures(space);
    const { isInvalid: isSolutionViewInvalid } = this.validateSolutionView(
      space,
      isEditing,
      allowSolutionVisibility
    );

    if (
      isNameInvalid ||
      isDescriptionInvalid ||
      isIdentifierInvalid ||
      isAvatarInitialsInvalid ||
      isAvatarColorInvalid ||
      isAvatarImageInvalid ||
      areFeaturesInvalid ||
      isSolutionViewInvalid
    ) {
      return invalid();
    }

    return valid();
  }
}

function invalid(error: string = '') {
  return {
    isInvalid: true,
    error,
  };
}

function valid() {
  return {
    isInvalid: false,
  };
}
