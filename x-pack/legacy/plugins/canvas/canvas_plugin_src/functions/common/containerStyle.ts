/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { ContainerStyle, Overflow, BackgroundRepeat, BackgroundSize } from '../types';
import { getFunctionHelp, getFunctionErrors } from '../../strings';
// @ts-ignore untyped local
import { isValidUrl } from '../../../common/lib/url';

interface Return extends ContainerStyle {
  type: 'containerStyle';
}

export function containerStyle(): ExpressionFunction<
  'containerStyle',
  null,
  ContainerStyle,
  Return
> {
  const { help, args: argHelp } = getFunctionHelp().containerStyle;
  const errors = getFunctionErrors().containerStyle;

  return {
    name: 'containerStyle',
    aliases: [],
    context: {
      types: ['null'],
    },
    type: 'containerStyle',
    help,
    args: {
      border: {
        types: ['string'],
        help: argHelp.border,
      },
      borderRadius: {
        types: ['string'],
        help: argHelp.borderRadius,
      },
      padding: {
        types: ['string'],
        help: argHelp.padding,
      },
      backgroundColor: {
        types: ['string'],
        help: argHelp.backgroundColor,
      },
      backgroundImage: {
        types: ['string'],
        help: argHelp.backgroundImage,
      },
      backgroundSize: {
        types: ['string'],
        help: argHelp.backgroundSize,
        default: 'contain',
        options: Object.values(BackgroundSize),
      },
      backgroundRepeat: {
        types: ['string'],
        help: argHelp.backgroundRepeat,
        default: 'no-repeat',
        options: Object.values(BackgroundRepeat),
      },
      opacity: {
        types: ['number'],
        help: argHelp.opacity,
      },
      overflow: {
        types: ['string'],
        help: argHelp.overflow,
        options: Object.values(Overflow),
        default: 'hidden',
      },
    },
    fn: (_context, args) => {
      const { backgroundImage, backgroundSize, backgroundRepeat, ...remainingArgs } = args;
      const style = {
        type: 'containerStyle',
        ...remainingArgs,
      } as Return;

      if (backgroundImage) {
        if (!isValidUrl(backgroundImage)) {
          throw errors.invalidBackgroundImage();
        }

        style.backgroundImage = `url(${backgroundImage})`;
        style.backgroundSize = backgroundSize;
        style.backgroundRepeat = backgroundRepeat;
      }

      // removes keys with undefined value
      return JSON.parse(JSON.stringify(style));
    },
  };
}
