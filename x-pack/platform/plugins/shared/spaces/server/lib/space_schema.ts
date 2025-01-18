/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { MAX_SPACE_INITIALS } from '../../common';

export const SPACE_ID_REGEX = /^[a-z0-9_\-]+$/;

const spaceSchema = schema.object({
  id: schema.string({
    validate: (value) => {
      if (!SPACE_ID_REGEX.test(value)) {
        return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
      }
    },
    meta: {
      description:
        'The space ID that is part of the Kibana URL when inside the space. Space IDs are limited to lowercase alphanumeric, underscore, and hyphen characters (a-z, 0-9, _, and -). You are cannot change the ID with the update operation.',
    },
  }),
  name: schema.string({
    minLength: 1,
    meta: { description: 'The display name for the space. ' },
  }),
  description: schema.maybe(
    schema.string({
      meta: { description: 'A description for the space.' },
    })
  ),
  initials: schema.maybe(
    schema.string({
      maxLength: MAX_SPACE_INITIALS,
      meta: {
        description:
          'One or two characters that are shown in the space avatar. By default, the initials are automatically generated from the space name.',
      },
    })
  ),
  color: schema.maybe(
    schema.string({
      validate: (value) => {
        if (!/^#[a-zA-Z0-9]{6}$/.test(value)) {
          return `must be a 6 digit hex color, starting with a #`;
        }
      },
      meta: {
        description:
          'The hexadecimal color code used in the space avatar. By default, the color is automatically generated from the space name.',
      },
    })
  ),
  disabledFeatures: schema.arrayOf(
    schema.string({
      meta: {
        description: 'The list of features that are turned off in the space.',
      },
    }),
    { defaultValue: [] }
  ),
  _reserved: schema.maybe(schema.boolean()),
  imageUrl: schema.maybe(
    schema.string({
      validate: (value) => {
        if (value !== '' && !/^data:image.*$/.test(value)) {
          return `must start with 'data:image'`;
        }
      },
      meta: {
        description:
          'The data-URL encoded image to display in the space avatar. If specified, initials will not be displayed and the color will be visible as the background color for transparent images. For best results, your image should be 64x64. Images will not be optimized by this API call, so care should be taken when using custom images.',
      },
    })
  ),
});

export const solutionSchema = schema.oneOf([
  schema.literal('security'),
  schema.literal('oblt'),
  schema.literal('es'),
  schema.literal('classic'),
]);

export const getSpaceSchema = (isServerless: boolean) => {
  if (isServerless) {
    return spaceSchema;
  }

  return spaceSchema.extends({ solution: schema.maybe(solutionSchema) });
};
