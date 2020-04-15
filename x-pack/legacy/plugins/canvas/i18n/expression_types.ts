/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ArgTypesStrings = {
  Color: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.colorDisplayName', {
        defaultMessage: 'Color',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.colorHelp', {
        defaultMessage: 'Color picker',
      }),
  },
  ContainerStyle: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyleTitle', {
        defaultMessage: 'Container style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyleLabel', {
        defaultMessage: 'Tweak the appearance of the element container',
      }),
    getAppearanceTitle: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.appearanceTitle', {
        defaultMessage: 'Appearance',
      }),
    getBorderTitle: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.borderTitle', {
        defaultMessage: 'Border',
      }),
    getPaddingLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.paddingLabel', {
        defaultMessage: 'Padding',
      }),
    getOpacityLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.opacityLabel', {
        defaultMessage: 'Opacity',
      }),
    getOverflowLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.overflowLabel', {
        defaultMessage: 'Overflow',
      }),
    getOverflowHiddenOption: () =>
      i18n.translate(
        'xpack.canvas.expressionTypes.argTypes.containerStyle.overflowHiddenDropDown',
        {
          defaultMessage: 'Hidden',
        }
      ),
    getOverflowVisibleOption: () =>
      i18n.translate(
        'xpack.canvas.expressionTypes.argTypes.containerStyle.overflowVisibleDropDown',
        {
          defaultMessage: 'Visible',
        }
      ),
    getThicknessLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.thicknessLabel', {
        defaultMessage: 'Thickness',
      }),
    getStyleLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.styleLabel', {
        defaultMessage: 'Style',
      }),
    getRadiusLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.radiusLabel', {
        defaultMessage: 'Radius',
      }),
    getColorLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.containerStyle.colorLabel', {
        defaultMessage: 'Color',
      }),
  },
  Font: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.fontTitle', {
        defaultMessage: 'Text settings',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.fontHelpLabel', {
        defaultMessage: 'Set the font, size and color',
      }),
  },
  SeriesStyle: {
    getDisplayName: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyleTitle', {
        defaultMessage: 'Series style',
      }),
    getHelp: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyleLabel', {
        defaultMessage: 'Set the style for a selected named series',
      }),
    getColorLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.colorLabel', {
        defaultMessage: 'Color',
      }),
    getColorValueDefault: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.colorValueDefault', {
        defaultMessage: 'Auto',
      }),
    getStyleLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.styleLabel', {
        defaultMessage: 'Style',
      }),
    getRemoveAriaLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.removeAriaLabel', {
        defaultMessage: 'Remove series color',
      }),
    getNoSeriesTooltip: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.noSeriesTooltip', {
        defaultMessage: 'Data has no series to style, add a color dimension',
      }),
    getSeriesIdentifierLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.seriesIdentifierLabel', {
        defaultMessage: 'Series id',
      }),
    getSelectSeriesOption: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.selectSeriesDropDown', {
        defaultMessage: 'Select series',
      }),
    getLineLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.lineLabel', {
        defaultMessage: 'Line',
      }),
    getBarLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.barLabel', {
        defaultMessage: 'Bar',
      }),
    getPointLabel: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.pointLabel', {
        defaultMessage: 'Point',
      }),
    getNoneOption: () =>
      i18n.translate('xpack.canvas.expressionTypes.argTypes.seriesStyle.noneDropDown', {
        defaultMessage: 'None',
      }),
  },
};
