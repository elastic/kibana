/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpaceValidator } from './validate_space';

let validator: SpaceValidator;

beforeEach(() => {
  validator = new SpaceValidator({
    shouldValidate: true,
  });
});

describe('validateSpaceName', () => {
  test('it allows a name with special characters', () => {
    const space = {
      id: '',
      name: 'This is the name of my Space! @#$%^&*()_+-=',
    };

    expect(validator.validateSpaceName(space)).toHaveProperty('isInvalid', false);
  });

  test('it requires a non-empty value', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateSpaceName(space)).toHaveProperty('isInvalid', true);
  });

  test('it cannot be composed entirely of whitespace', () => {
    const space = {
      id: '',
      name: '         ',
    };

    expect(validator.validateSpaceName(space)).toHaveProperty('isInvalid', true);
  });

  test('it cannot exceed 1024 characters', () => {
    const space = {
      id: '',
      name: new Array(1026).join('A'),
    };

    expect(validator.validateSpaceName(space)).toHaveProperty('isInvalid', true);
  });
});

describe('validateSpaceDescription', () => {
  test('is optional', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateSpaceDescription(space)).toHaveProperty('isInvalid', false);
  });

  test('it cannot exceed 2000 characters', () => {
    const space = {
      id: '',
      name: '',
      description: new Array(2002).join('A'),
    };

    expect(validator.validateSpaceDescription(space)).toHaveProperty('isInvalid', true);
  });
});

describe('validateURLIdentifier', () => {
  test('it does not validate reserved spaces', () => {
    const space = {
      id: '',
      name: '',
      _reserved: true,
    };

    expect(validator.validateURLIdentifier(space)).toHaveProperty('isInvalid', false);
  });

  test('it requires a non-empty value', () => {
    const space = {
      id: '',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toHaveProperty('isInvalid', true);
  });

  test('it requires a valid Space Identifier', () => {
    const space = {
      id: 'invalid identifier',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toHaveProperty('isInvalid', true);
  });

  test('it allows a valid Space Identifier', () => {
    const space = {
      id: '01-valid-context-01',
      name: '',
    };

    expect(validator.validateURLIdentifier(space)).toEqual({ isInvalid: false });
  });
});

describe('validateAvatarInitials', () => {
  it('it allows valid initials', () => {
    const space = {
      initials: 'FF',
    };

    expect(validator.validateAvatarInitials(space)).toHaveProperty('isInvalid', false);
  });

  it('it requires a non-empty value', () => {
    const space = {
      initials: '',
    };

    expect(validator.validateAvatarInitials(space)).toHaveProperty('isInvalid', true);
  });

  it('must not exceed 2 characters', () => {
    const space = {
      initials: 'FFF',
    };

    expect(validator.validateAvatarInitials(space)).toHaveProperty('isInvalid', true);
  });

  it('it does not validate image avatars', () => {
    const space = {
      avatarType: 'image' as 'image',
      initials: '',
    };

    expect(validator.validateAvatarInitials(space)).toHaveProperty('isInvalid', false);
  });
});

describe('validateAvatarColor', () => {
  it('it allows valid colors', () => {
    const space = {
      color: '#000000',
    };

    expect(validator.validateAvatarColor(space)).toHaveProperty('isInvalid', false);
  });

  it('it requires a non-empty value', () => {
    const space = {
      color: '',
    };

    expect(validator.validateAvatarColor(space)).toHaveProperty('isInvalid', true);
  });

  it('it requires a valid hex code', () => {
    const space = {
      color: 'red',
    };

    expect(validator.validateAvatarColor(space)).toHaveProperty('isInvalid', true);
  });
});

describe('validateAvatarImage', () => {
  it('it allows valid image url', () => {
    const space = {
      avatarType: 'image' as 'image',
      imageUrl: 'foo',
    };

    expect(validator.validateAvatarImage(space)).toHaveProperty('isInvalid', false);
  });

  it('it requires a non-empty value', () => {
    const space = {
      avatarType: 'image' as 'image',
      imageUrl: '',
    };

    expect(validator.validateAvatarImage(space)).toHaveProperty('isInvalid', true);
  });

  it('it does not validate non-image avatars', () => {
    const space = {
      imageUrl: '',
    };

    expect(validator.validateAvatarImage(space)).toHaveProperty('isInvalid', false);
  });
});

describe('validateSpaceFeatures', () => {
  it('allows features to be disabled', () => {
    const space = {
      id: '',
      name: '',
      disabledFeatures: ['foo'],
    };

    expect(validator.validateEnabledFeatures(space)).toHaveProperty('isInvalid', false);
  });

  it('allows all features to be disabled', () => {
    const space = {
      id: '',
      name: '',
      disabledFeatures: ['foo', 'bar'],
    };

    expect(validator.validateEnabledFeatures(space)).toHaveProperty('isInvalid', false);
  });
});
