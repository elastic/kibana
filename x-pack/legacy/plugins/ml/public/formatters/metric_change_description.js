/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Produces a concise textual description of how the
 * actual value compares to the typical value for an anomaly.
 */

import { i18n } from '@kbn/i18n';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

// Returns an Object containing a text message and EuiIcon type to
// describe how the actual value compares to the typical.
export function getMetricChangeDescription(actualProp, typicalProp) {
  if (actualProp === undefined || typicalProp === undefined) {
    return { iconType: 'empty', message: '' };
  }

  let iconType;
  let message;

  // For metric functions, actual and typical will be single value arrays.
  let actual = actualProp;
  let typical = typicalProp;
  if (Array.isArray(actualProp)) {
    if (actualProp.length === 1) {
      actual = actualProp[0];
    } else {
      // TODO - do we want to enhance the description depending on detector?
      // e.g. 'Unusual location' if using a lat_long detector.
      return {
        iconType: 'alert',
        message: i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unusualValuesDescription',
          {
            defaultMessage: 'Unusual values',
          }
        ),
      };
    }
  }

  if (Array.isArray(typicalProp)) {
    if (typicalProp.length === 1) {
      typical = typicalProp[0];
    }
  }

  if (actual === typical) {
    // Very unlikely, but just in case.
    message = i18n.translate(
      'xpack.ml.formatters.metricChangeDescription.actualSameAsTypicalDescription',
      {
        defaultMessage: 'actual same as typical',
      }
    );
  } else {
    // For actual / typical gives output of the form:
    // 4 / 2        2x higher
    // 2 / 10       5x lower
    // 1000 / 1     More than 100x higher
    // 999 / 1000   Unusually low
    // 100 / -100   Unusually high
    // 0 / 100      Unexpected zero value
    // 1 / 0        Unexpected non-zero value
    const isHigher = actual > typical;
    iconType = isHigher ? 'sortUp' : 'sortDown';
    if (typical !== 0 && actual !== 0) {
      const factor = isHigher ? actual / typical : typical / actual;
      if (factor > 1.5) {
        if (factor <= 100) {
          message = isHigher
            ? i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThanOneAndHalfxHigherDescription',
                {
                  defaultMessage: '{factor}x higher',
                  values: { factor: Math.round(factor) },
                }
              )
            : i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThanOneAndHalfxLowerDescription',
                {
                  defaultMessage: '{factor}x lower',
                  values: { factor: Math.round(factor) },
                }
              );
        } else {
          message = isHigher
            ? i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThan100xHigherDescription',
                {
                  defaultMessage: 'More than 100x higher',
                }
              )
            : i18n.translate(
                'xpack.ml.formatters.metricChangeDescription.moreThan100xLowerDescription',
                {
                  defaultMessage: 'More than 100x lower',
                }
              );
        }
      } else if (factor >= 1.05) {
        message = isHigher
          ? i18n.translate(
              'xpack.ml.formatters.metricChangeDescription.moreThanOneAndFiveHundredthsxHigherDescription',
              {
                defaultMessage: '{factor}x higher',
                values: { factor: factor.toPrecision(2) },
              }
            )
          : i18n.translate(
              'xpack.ml.formatters.metricChangeDescription.moreThanOneAndFiveHundredthsxLowerDescription',
              {
                defaultMessage: '{factor}x lower',
                values: { factor: factor.toPrecision(2) },
              }
            );
      } else {
        message = isHigher
          ? i18n.translate('xpack.ml.formatters.metricChangeDescription.unusuallyHighDescription', {
              defaultMessage: 'Unusually high',
            })
          : i18n.translate('xpack.ml.formatters.metricChangeDescription.unusuallyLowDescription', {
              defaultMessage: 'Unusually low',
            });
      }
    } else {
      if (actual === 0) {
        message = i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unexpectedZeroValueDescription',
          {
            defaultMessage: 'Unexpected zero value',
          }
        );
      } else {
        message = i18n.translate(
          'xpack.ml.formatters.metricChangeDescription.unexpectedNonZeroValueDescription',
          {
            defaultMessage: 'Unexpected non-zero value',
          }
        );
      }
    }
  }

  return { iconType, message };
}

// TODO - remove the filter once all uses of the metricChangeDescription Angular filter have been removed.
module.filter('metricChangeDescription', function() {
  return function(actual, typical) {
    const { iconType, message } = getMetricChangeDescription(actual, typical);

    switch (iconType) {
      case 'sortUp':
        return `<i class="fa fa-arrow-up"></i> ${message}`;
      case 'sortDown':
        return `<i class="fa fa-arrow-down"></i> ${message}`;
      case 'alert':
        return `<i class="fa fa-exclamation-triangle"></i> ${message}`;
    }

    return message;
  };
});
