/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const FRACTIONAL_SECOND_SEPARATORS = ':.,';

const VALID_LETTER_GROUPS = {
  'yyyy': true,
  'yy': true,
  'M': true,
  'MM': true,
  'MMM': true,
  'MMMM': true,
  'd': true,
  'dd': true,
  'EEE': true,
  'EEEE': true,
  'H': true,
  'HH': true,
  'h': true,
  'mm': true,
  'ss': true,
  'a': true,
  'XX': true,
  'XXX': true,
  'zzz': true,
};

function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

export function isTimestampFormatValid(timestampFormat) {
  const result = { isValid: true, errorMessage: null };

  if (timestampFormat.indexOf('?') >= 0) {
    result.isValid = false;
    result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.timestampQuestionMarkValidationErrorMessage', {
      defaultMessage: 'Timestamp format {timestampFormat} not supported because it contains a question mark character ({fieldPlaceholder})',
      values: {
        timestampFormat,
        fieldPlaceholder: '?',
      }
    });
    return result;
  }

  let notQuoted = true;
  let prevChar = null;
  let prevLetterGroup = null;
  let pos = 0;

  while (pos < timestampFormat.length) {
    const curChar = timestampFormat.charAt(pos);

    if (curChar === '\'') {
      notQuoted = !notQuoted;
    } else if (notQuoted && isLetter(curChar)) {
      const startPos = pos;
      let endPos = startPos + 1;
      while (endPos < timestampFormat.length && timestampFormat.charAt(endPos) === curChar) {
        ++endPos;
        ++pos;
      }

      const letterGroup = timestampFormat.substring(startPos, endPos);

      if (VALID_LETTER_GROUPS[letterGroup] !== true) {
        const length = letterGroup.length;
        // Special case of fractional seconds
        if (curChar !== 'S' || FRACTIONAL_SECOND_SEPARATORS.indexOf(prevChar) === -1 ||
          !('ss' === prevLetterGroup) || endPos - startPos > 9) {
          result.isValid = false;

          result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.timestampLetterValidationErrorMessage', {
            defaultMessage: 'Letter { length, plural, one { {lg} } other { group {lg} } } in {format} is not supported',
            values: {
              length,
              lg: letterGroup,
              format: timestampFormat
            },
          });

          if (curChar === 'S') {
            // disable exceeds maximum line length error so i18n check passes
            result.errorMessage = i18n.translate(
              'xpack.ml.fileDatavisualizer.editFlyout.overrides.timestampLetterSValidationErrorMessage',
              {
                defaultMessage: 'Letter { length, plural, one { {lg} } other { group {lg} } } in {format} is not supported because it is not preceded by ss and a separator from {sep}', // eslint-disable-line
                values: {
                  length,
                  lg: letterGroup,
                  sep: FRACTIONAL_SECOND_SEPARATORS,
                  format: timestampFormat
                },
              });
          }

          return result;
        }
      }
      prevLetterGroup = letterGroup;
    }

    prevChar = curChar;
    ++pos;
  }

  if (prevLetterGroup == null) {
    result.isValid = false;
    result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.timestampEmptyValidationErrorMessage', {
      defaultMessage: 'No time format letter groups in timestamp format {timestampFormat}',
      values: {
        timestampFormat,
      }
    });
  }

  return result;
}
